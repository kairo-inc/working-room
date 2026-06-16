import { inject, injectable } from "tsyringe"
import z from "zod"

import { FileAccessService } from "@wr/access"
import { DomainToolType } from "@wr/shared"
import { randomId } from "@wr/shared-node"

import { Tool, ToolRunArgs, ToolRunResult } from "./base"

const inputSchema = z.object({
  descId: z.string().describe("The ID of the file to read. This should be a file that the agent has access to."),
  maxChars: z
    .number()
    .optional()
    .describe("The maximum number of characters to read from the file. If not provided, the entire file will be read."),
})

@injectable()
export class ToolReadTextFile extends Tool {
  name = "ToolReadTextFile"
  description = "Read the content of a text file. Use this when you need to extract information from text files."
  needApproval = false
  inputSchema = inputSchema
  toolType: DomainToolType = "read"

  constructor(@inject("FileAccessService") private fileAccessService: FileAccessService) {
    super()
  }

  async run({ toolCall }: ToolRunArgs): Promise<ToolRunResult> {
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
      return {
        message: {
          id: randomId(),
          role: "tool",
          content: [
            { type: "tool-result", toolCallId, toolName, output: { type: "text", value: textContent } },
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
