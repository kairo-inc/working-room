import { inject, injectable } from "tsyringe"
import z from "zod"

import { FileAccessService } from "@wr/access"
import { AiModelTier, AiVendorConfigs, DomainToolType } from "@wr/shared"
import { randomId } from "@wr/shared-node"

import { Model } from "../model"
import { Tool, ToolRunArgs, ToolRunResult } from "./base"

const inputSchema = z.object({
  descId: z
    .string()
    .describe(`The ID of the existing file to perform this action on. This should be a file or folder that the agent has access to.`),
  purpose: z
    .string()
    .optional()
    .describe(
      "Why you are reading this file / what you want to find in it. If the file is large enough to be summarized instead of returned in full, the summary will focus on this."
    ),
})

// PDFs are embedded as base64 file content for the model to read natively; large files consume a lot
// of context on every subsequent turn, so anything over this size is summarized instead.
const SUMMARIZE_THRESHOLD_BYTES = 2 * 1024 * 1024

@injectable()
export class ToolReadPdfFile extends Tool {
  name = "ToolReadPdfFile"
  description = "Read the content of a PDF file. Use this when you need to extract information from PDF files."
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
      // Check mime type and existence of the file.
      const targetFileDescriptor = await this.fileAccessService.getDescriptor(input.data.descId)
      const fileContent = await this.fileAccessService.readFile({
        id: input.data.descId,
      })
      const base64Content = Buffer.from(fileContent).toString("base64")

      if (fileContent.byteLength > SUMMARIZE_THRESHOLD_BYTES) {
        const tierOverride = config.tierOverrides?.[toolName]
        const model = new Model({ modelTier: tierOverride ?? this.defaultTier, vendorConfigs: this.aiVendorConfigs })
        const purposeInstruction = input.data.purpose
          ? `The reader's purpose for reading this file is: "${input.data.purpose}". Focus the summary on details relevant to that purpose, without omitting other important context.`
          : "No specific purpose was given, so provide a general-purpose summary covering the document's key content."
        const result = await model.generateText({
          messages: [
            {
              role: "system",
              content: `Summarize the following PDF document concisely, preserving key facts, structure, and any details a reader who has not seen the original would need. ${purposeInstruction} Do not add commentary about the summarization itself.`,
            },
            {
              role: "user",
              content: [{ type: "file", descId: targetFileDescriptor.id, data: base64Content, mediaType: targetFileDescriptor.mimeType }],
            },
          ],
        })
        const summaryText = result.content.find((c) => c.type === "text")?.text ?? ""
        return {
          message: {
            id: randomId(),
            role: "tool",
            content: [
              {
                type: "tool-result",
                toolCallId,
                toolName,
                output: { type: "text", value: `[Summarized: original PDF was ${fileContent.byteLength} bytes.]\n\n${summaryText}` },
              },
              {
                type: "proceeded-file",
                descId: targetFileDescriptor.id,
                blobHash: targetFileDescriptor.blobHash,
                mimeType: targetFileDescriptor.mimeType,
              },
            ],
          },
          tokens: result.tokens,
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
              output: {
                type: "file",
                data: base64Content,
                mediaType: targetFileDescriptor.mimeType,
                descId: targetFileDescriptor.id,
              },
            },
            {
              type: "proceeded-file",
              descId: targetFileDescriptor.id,
              blobHash: targetFileDescriptor.blobHash,
              mimeType: targetFileDescriptor.mimeType,
            },
          ],
        },
      }
    } catch (e) {
      return {
        message: this.buildError(toolCall, `Failed to read file: ${(e as Error).message}`),
      }
    }
  }
}
