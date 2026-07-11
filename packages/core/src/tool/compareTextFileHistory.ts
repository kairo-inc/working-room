import { inject, injectable } from "tsyringe"
import z from "zod"

import { FileAccessService } from "@wr/access"
import { DomainMessageContentProceededFile, DomainToolType, NotFoundError } from "@wr/shared"
import { randomId } from "@wr/shared-node"

import { Tool, ToolRunArgs, ToolRunResult } from "./base"

const inputSchema = z.object({
  sourceHistoryId: z.string().describe(`The ID of the history item to read.`),
  targetHistoryId: z.string().describe(`The ID of the history item to compare against.`),
})

@injectable()
export class ToolCompareTextFileHistory extends Tool {
  name = "ToolCompareTextFileHistory"
  description = `Compare the history of a text file descriptor. Use this to view the differences between specific points in a text file's history.
Be careful of the file type when using this tool. This tool is designed for text files such as .txt, .csv, or .md files. Using it on binary files may result in unreadable output.`

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
      return { message: this.buildError(toolCall, `Invalid input: ${input.error.message}`) }
    }

    try {
      const history = await this.fileAccessService.readHistory({ historyId: input.data.sourceHistoryId })
      const compareToHistory = await this.fileAccessService.readHistory({ historyId: input.data.targetHistoryId })
      const desc = await this.fileAccessService.getDescriptor(history.fileDescriptorId)
      if (desc.isDirectory) {
        return { message: this.buildError(toolCall, `Given history ID corresponds to a directory. Please provide a file history ID.`) }
      } else if (!desc.mimeType.startsWith("text/")) {
        return {
          message: this.buildError(
            toolCall,
            `Given history ID corresponds to a non-text file (${desc.mimeType}). Please provide a text file history ID.`
          ),
        }
      } else if (!history.blobHash || !compareToHistory.blobHash) {
        return { message: this.buildError(toolCall, `The history item does not have a blob hash. Cannot read content.`) }
      } else if (history.id === compareToHistory.id) {
        return { message: this.buildError(toolCall, `Comparing the same history id. No differences to show.`) }
      } else if (history.fileDescriptorId !== compareToHistory.fileDescriptorId) {
        return { message: this.buildError(toolCall, `The two history items belong to different file descriptors. Cannot compare.`) }
      }

      // Construct the result message and file content
      const proceededFiles: DomainMessageContentProceededFile[] = []
      if (depth === 0) {
        proceededFiles.push({
          type: "proceeded-file",
          descId: desc.id,
          blobHash: desc.blobHash,
          mimeType: desc.mimeType,
        })
      }

      const difference = await this.fileAccessService.differenceBlob({
        sourceBlobHash: history.blobHash,
        targetBlobHash: compareToHistory.blobHash,
        filename: desc.name,
      })
      return {
        message: {
          id: randomId(),
          role: "tool",
          content: [{ type: "tool-result", toolCallId, toolName, output: { type: "text", value: difference } }, ...proceededFiles],
        },
      }
    } catch (e) {
      if (e instanceof NotFoundError) {
        return { message: this.buildError(toolCall, `History not found: ${input.data.sourceHistoryId}`) }
      }
      return { message: this.buildError(toolCall, `Failed to compare history: ${e instanceof Error ? e.message : String(e)}`) }
    }
  }
}
