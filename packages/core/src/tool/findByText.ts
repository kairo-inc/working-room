import { inject, injectable } from "tsyringe"
import z from "zod"

import { FileAccessService } from "@wr/access"
import { DomainMessageContentProceededFile, DomainToolMessage, DomainToolType, NotFoundError } from "@wr/shared"
import { randomId } from "@wr/shared-node"

import { fileDescriptorToMessageContent } from "../prompt/file"
import { Tool, ToolRunArgs, ToolRunResult } from "./base"

const inputSchema = z.object({
  searchText: z.string().describe("The text to search for in the files."),
})

@injectable()
export class ToolFindFileByText extends Tool {
  name = "ToolFindFileByText"
  description = `Find files containing the specified text.
This tool will return a list of files but not the content of the files. `
  needApproval = false
  inputSchema = inputSchema
  toolType: DomainToolType = "read"

  constructor(@inject("FileAccessService") private fileAccessService: FileAccessService) {
    super()
  }

  async run({ toolCall, ctx: { depth } }: ToolRunArgs): Promise<ToolRunResult> {
    const { toolCallId, toolName } = toolCall
    const input = this.inputSchema.safeParse(toolCall.input)
    if (!input.success) {
      return {
        message: this.buildError(toolCall, `Invalid input: ${input.error.message}`),
      }
    }
    try {
      const result = await this.fileAccessService.findByText(input.data.searchText)
      const resultMessage = `Found ${result.files.length} items. Listing up to ${result.totalCount}.\n`
      const fileMessage = result.files.map((file) => fileDescriptorToMessageContent(file)).join("\n")

      const resultContent: DomainToolMessage["content"] = []
      resultContent.push({ type: "tool-result", toolCallId, toolName, output: { type: "text", value: resultMessage } })
      resultContent.push({ type: "tool-result", toolCallId, toolName, output: { type: "text", value: fileMessage } })

      if (depth === 0) {
        resultContent.push(
          ...result.files.map(
            (file) =>
              ({
                type: "proceeded-file",
                blobHash: file.blobHash,
                descId: file.id,
                mimeType: file.mimeType,
              }) satisfies DomainMessageContentProceededFile
          )
        )
      }

      return {
        message: {
          id: randomId(),
          role: "tool",
          content: resultContent,
        },
      }
    } catch (e) {
      if (e instanceof NotFoundError) {
        return {
          message: this.buildError(toolCall, `No files found containing the text: ${input.data.searchText}`),
        }
      }
      return {
        message: this.buildError(toolCall, `Failed to find files by text: ${(e as Error).message}`),
      }
    }
  }
}
