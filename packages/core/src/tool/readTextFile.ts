import { inject, injectable } from "tsyringe"
import z from "zod"

import { FileAccessService } from "@wr/access"
import { AiModelTier, AiVendorConfigs, DomainToolType } from "@wr/shared"
import { randomId } from "@wr/shared-node"

import { Model } from "../model"
import { Tool, ToolRunArgs, ToolRunResult } from "./base"

const inputSchema = z.object({
  descId: z.string().describe("The ID of the file to read. This should be a file that the agent has access to."),
  maxChars: z
    .number()
    .optional()
    .describe("The maximum number of characters to read from the file. If not provided, the entire file will be read."),
  purpose: z
    .string()
    .optional()
    .describe(
      "Why you are reading this file / what you want to find in it. If the file is large enough to be summarized instead of returned in full, the summary will focus on this."
    ),
})

// Roughly corresponds to 20,000 characters, assuming 1 character = 1 byte on average.
const SUMMARIZE_THRESHOLD_CHARS = 20000

@injectable()
export class ToolReadTextFile extends Tool {
  name = "ToolReadTextFile"
  description = "Read the content of a text file. Use this when you need to extract information from text files."
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
      const fileContent = await this.fileAccessService.readFile({
        id: input.data.descId,
        maxBytes: input.data.maxChars ? input.data.maxChars * 4 : undefined,
      })
      const decoder = new TextDecoder()
      const textContent = decoder.decode(fileContent)

      let outputText = textContent
      let tokens
      if (!input.data.maxChars && textContent.length > SUMMARIZE_THRESHOLD_CHARS) {
        const tierOverride = config.tierOverrides?.[toolName]
        const model = new Model({ modelTier: tierOverride ?? this.defaultTier, vendorConfigs: this.aiVendorConfigs })
        const purposeInstruction = input.data.purpose
          ? `The reader's purpose for reading this file is: "${input.data.purpose}". Focus the summary on details relevant to that purpose, without omitting other important context.`
          : "No specific purpose was given, so provide a general-purpose summary covering the file's key content."
        const result = await model.generateText({
          messages: [
            {
              role: "system",
              content: `Summarize the following file content concisely, preserving key facts, structure, and any details a reader who has not seen the original would need. ${purposeInstruction} Do not add commentary about the summarization itself.`,
            },
            { role: "user", content: [{ type: "text", text: textContent }] },
          ],
        })
        const summaryText = result.content.find((c) => c.type === "text")?.text ?? ""
        outputText = `[Summarized: original content was ${textContent.length} characters. Use maxChars to read the exact original text instead.]\n\n${summaryText}`
        tokens = result.tokens
      }

      return {
        message: {
          id: randomId(),
          role: "tool",
          content: [
            { type: "tool-result", toolCallId, toolName, output: { type: "text", value: outputText } },
            {
              type: "proceeded-file",
              descId: targetFileDescriptor.id,
              blobHash: targetFileDescriptor.blobHash,
              mimeType: targetFileDescriptor.mimeType,
            },
          ],
        },
        tokens,
      }
    } catch (e) {
      return {
        message: this.buildError(toolCall, `Failed to read file: ${(e as Error).message}`),
      }
    }
  }
}
