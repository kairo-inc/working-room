import { inject, injectable } from "tsyringe"
import z from "zod"

import { FileAccessService } from "@wr/access"
import {
  AiModelTier,
  AiVendorConfigs,
  DomainFileDescriptor,
  DomainMessageContentFile,
  DomainMessageContentText,
  DomainToolType,
  ImageMimeType,
} from "@wr/shared"
import { randomId } from "@wr/shared-node"

import { Model } from "../model"
import { extractOfficeText, isOfficeMimeType } from "../office"
import { Tool, ToolRunArgs, ToolRunResult } from "./base"

const inputSchema = z.object({
  descId: z
    .string()
    .describe(`The ID of the existing file to perform this action on. This should be a file or folder that the agent has access to.`),
  maxChars: z
    .number()
    .optional()
    .describe(
      "The maximum number of characters to read from the file's text content. Only applies to text, Word, Excel, and PowerPoint files, not PDFs. If not provided, the entire content will be read."
    ),
  purpose: z
    .string()
    .optional()
    .describe(
      "Why you are reading this file / what you want to find in it. If the file is large enough to be summarized instead of returned in full, the summary will focus on this."
    ),
})

// Roughly corresponds to 20,000 characters, assuming 1 character = 1 byte on average.
const TEXT_SUMMARIZE_THRESHOLD_CHARS = 20000

// PDFs are embedded as base64 file content for the model to read natively; large files consume a lot
// of context on every subsequent turn, so anything over this size is summarized instead.
const PDF_SUMMARIZE_THRESHOLD_BYTES = 2 * 1024 * 1024

@injectable()
export class ToolReadFile extends Tool {
  name = "ToolReadFile"
  description =
    "Read the content of a file. Supports text files, PDFs, images, and Office documents (Word, Excel, PowerPoint). Use this when you need to extract information from a file."
  needApproval = false
  inputSchema = inputSchema
  toolType: DomainToolType = "read"
  defaultTier: AiModelTier = "medium"

  constructor(
    @inject("FileAccessService") private fileAccessService: FileAccessService,
    @inject("AiVendorConfigs") private aiVendorConfigs: AiVendorConfigs
  ) {
    super()
  }

  async run({ toolCall, config }: ToolRunArgs): Promise<ToolRunResult> {
    const { toolCallId, toolName } = toolCall
    const input = this.inputSchema.safeParse(toolCall.input)
    if (!input.success) {
      return {
        message: this.buildError(toolCall, `Invalid input: ${input.error.message}`),
      }
    }
    try {
      const targetFileDescriptor = await this.fileAccessService.getDescriptor(input.data.descId)
      const { mimeType } = targetFileDescriptor

      if (mimeType === "application/pdf") {
        return await this.readPdf({ toolCallId, toolName, config, targetFileDescriptor, purpose: input.data.purpose })
      } else if (mimeType.startsWith("image/")) {
        return await this.readImage({ toolCallId, toolName, targetFileDescriptor })
      } else if (mimeType.startsWith("text/")) {
        return await this.readText({
          toolCallId,
          toolName,
          config,
          targetFileDescriptor,
          maxChars: input.data.maxChars,
          purpose: input.data.purpose,
        })
      } else if (isOfficeMimeType(mimeType)) {
        return await this.readOffice({
          toolCallId,
          toolName,
          config,
          targetFileDescriptor,
          maxChars: input.data.maxChars,
          purpose: input.data.purpose,
        })
      }
      return {
        message: this.buildError(toolCall, `Unsupported file type "${mimeType}".`),
      }
    } catch (e) {
      return {
        message: this.buildError(toolCall, `Failed to read file: ${(e as Error).message}`),
      }
    }
  }

  private async readPdf(args: {
    toolCallId: string
    toolName: string
    config: ToolRunArgs["config"]
    targetFileDescriptor: DomainFileDescriptor
    purpose?: string
  }): Promise<ToolRunResult> {
    const { toolCallId, toolName, config, targetFileDescriptor, purpose } = args
    const fileContent = await this.fileAccessService.readFile({ id: targetFileDescriptor.id })
    const base64Content = Buffer.from(fileContent).toString("base64")

    if (fileContent.byteLength > PDF_SUMMARIZE_THRESHOLD_BYTES) {
      const summary = await this.summarize({
        toolName,
        config,
        purpose,
        documentLabel: "PDF document",
        content: [{ type: "file", descId: targetFileDescriptor.id, data: base64Content, mediaType: targetFileDescriptor.mimeType }],
      })
      return {
        message: {
          id: randomId(),
          role: "tool",
          content: [
            {
              type: "tool-result",
              toolCallId,
              toolName,
              output: { type: "text", value: `[Summarized: original PDF was ${fileContent.byteLength} bytes.]\n\n${summary.text}` },
            },
            this.buildProceededFile(targetFileDescriptor),
          ],
        },
        tokens: summary.tokens,
      }
    }

    return {
      message: {
        id: randomId(),
        role: "tool",
        content: [
          {
            type: "tool-result",
            toolCallId,
            toolName,
            output: { type: "file", data: base64Content, mediaType: targetFileDescriptor.mimeType, descId: targetFileDescriptor.id },
          },
          this.buildProceededFile(targetFileDescriptor),
        ],
      },
    }
  }

  private async readImage(args: {
    toolCallId: string
    toolName: string
    targetFileDescriptor: DomainFileDescriptor
  }): Promise<ToolRunResult> {
    const { toolCallId, toolName, targetFileDescriptor } = args
    const fileContent = await this.fileAccessService.readFile({ id: targetFileDescriptor.id })
    const base64Content = Buffer.from(fileContent).toString("base64")
    return {
      message: {
        id: randomId(),
        role: "tool",
        content: [
          {
            type: "tool-result",
            toolCallId,
            toolName,
            output: {
              type: "image",
              image: base64Content,
              mediaType: targetFileDescriptor.mimeType as ImageMimeType,
              descId: targetFileDescriptor.id,
            },
          },
          this.buildProceededFile(targetFileDescriptor),
        ],
      },
    }
  }

  private async readText(args: {
    toolCallId: string
    toolName: string
    config: ToolRunArgs["config"]
    targetFileDescriptor: DomainFileDescriptor
    maxChars?: number
    purpose?: string
  }): Promise<ToolRunResult> {
    const { toolCallId, toolName, config, targetFileDescriptor, maxChars, purpose } = args
    const fileContent = await this.fileAccessService.readFile({
      id: targetFileDescriptor.id,
      maxBytes: maxChars ? maxChars * 4 : undefined,
    })
    const textContent = new TextDecoder().decode(fileContent)
    return this.buildTextResult({
      toolCallId,
      toolName,
      config,
      targetFileDescriptor,
      textContent,
      skipSummarization: !!maxChars,
      purpose,
      documentLabel: "file",
    })
  }

  private async readOffice(args: {
    toolCallId: string
    toolName: string
    config: ToolRunArgs["config"]
    targetFileDescriptor: DomainFileDescriptor
    maxChars?: number
    purpose?: string
  }): Promise<ToolRunResult> {
    const { toolCallId, toolName, config, targetFileDescriptor, maxChars, purpose } = args
    const fileContent = await this.fileAccessService.readFile({ id: targetFileDescriptor.id })
    const extractedText = await extractOfficeText(fileContent, targetFileDescriptor.mimeType)
    const textContent = maxChars ? extractedText.slice(0, maxChars) : extractedText
    return this.buildTextResult({
      toolCallId,
      toolName,
      config,
      targetFileDescriptor,
      textContent,
      skipSummarization: !!maxChars,
      purpose,
      documentLabel: "document",
    })
  }

  private async buildTextResult(args: {
    toolCallId: string
    toolName: string
    config: ToolRunArgs["config"]
    targetFileDescriptor: DomainFileDescriptor
    textContent: string
    skipSummarization: boolean
    purpose?: string
    documentLabel: string
  }): Promise<ToolRunResult> {
    const { toolCallId, toolName, config, targetFileDescriptor, textContent, skipSummarization, purpose, documentLabel } = args

    let outputText = textContent
    let tokens
    if (!skipSummarization && textContent.length > TEXT_SUMMARIZE_THRESHOLD_CHARS) {
      const summary = await this.summarize({
        toolName,
        config,
        purpose,
        documentLabel,
        content: [{ type: "text", text: textContent }],
      })
      outputText = `[Summarized: original content was ${textContent.length} characters. Use maxChars to read the exact original text instead.]\n\n${summary.text}`
      tokens = summary.tokens
    }

    return {
      message: {
        id: randomId(),
        role: "tool",
        content: [
          { type: "tool-result", toolCallId, toolName, output: { type: "text", value: outputText } },
          this.buildProceededFile(targetFileDescriptor),
        ],
      },
      tokens,
    }
  }

  private async summarize(args: {
    toolName: string
    config: ToolRunArgs["config"]
    purpose?: string
    documentLabel: string
    content: Array<DomainMessageContentText | DomainMessageContentFile>
  }) {
    const { toolName, config, purpose, documentLabel, content } = args
    const tierOverride = config.tierOverrides?.[toolName]
    const model = new Model({ modelTier: tierOverride ?? this.defaultTier, vendorConfigs: this.aiVendorConfigs })
    const purposeInstruction = purpose
      ? `The reader's purpose for reading this file is: "${purpose}". Focus the summary on details relevant to that purpose, without omitting other important context.`
      : `No specific purpose was given, so provide a general-purpose summary covering the ${documentLabel}'s key content.`
    const result = await model.generateText({
      messages: [
        {
          role: "system",
          content: `Summarize the following ${documentLabel} concisely, preserving key facts, structure, and any details a reader who has not seen the original would need. ${purposeInstruction} Do not add commentary about the summarization itself.`,
        },
        { role: "user", content },
      ],
    })
    return { text: result.content.find((c) => c.type === "text")?.text ?? "", tokens: result.tokens }
  }

  private buildProceededFile(targetFileDescriptor: DomainFileDescriptor) {
    return {
      type: "proceeded-file" as const,
      descId: targetFileDescriptor.id,
      blobHash: targetFileDescriptor.blobHash,
      mimeType: targetFileDescriptor.mimeType,
    }
  }
}
