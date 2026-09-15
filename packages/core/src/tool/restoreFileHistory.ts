import { inject, injectable } from "tsyringe"
import z from "zod"

import { FileAccessService } from "@wr/access"
import { BadRequestError, DomainMessageContentToolCall, DomainToolType, NotFoundError } from "@wr/shared"
import { randomId } from "@wr/shared-node"

import { Tool, ToolIncomingChange, ToolRunArgs, ToolRunResult } from "./base"

const inputSchema = z.object({
  targetHistoryId: z.string().describe(`The ID of the file history item to restore the file's content to.`),
})

@injectable()
export class ToolRestoreFileHistory extends Tool {
  name = "ToolRestoreFileHistory"
  description = `Restore a file's content to a previous version recorded in its edit history. Use this to undo an edit that turned out to be wrong, or to revert a file to a version the user asked for by description.
Use the ToolListHistory tool first to find the history ID of the version you want to restore.`

  needApproval = true
  inputSchema = inputSchema
  toolType: DomainToolType = "edit"

  constructor(@inject("FileAccessService") private fileAccessService: FileAccessService) {
    super()
  }

  public async getChangeDescription(toolCall: DomainMessageContentToolCall): Promise<ToolIncomingChange> {
    const parsed = inputSchema.safeParse(toolCall.input)
    if (!parsed.success) {
      throw new BadRequestError(`Invalid input: ${parsed.error.message}`)
    }

    const history = await this.fileAccessService.readHistory({ historyId: parsed.data.targetHistoryId })
    if (!history.blobHash) {
      throw new BadRequestError(`The history item does not have a blob hash. Cannot restore content.`)
    }

    const targetDesc = await this.fileAccessService.getDescriptor(history.fileDescriptorId)
    const readableFilePath = await this.fileAccessService.buildReadablePath(targetDesc.id)

    const diff = await this.fileAccessService.differenceBlob({
      sourceBlobHash: targetDesc.blobHash,
      targetBlobHash: history.blobHash,
      filename: targetDesc.name,
    })

    return {
      files: [
        {
          descId: targetDesc.id,
          mimeType: targetDesc.mimeType,
          path: readableFilePath,
        },
      ],
      change: diff,
    }
  }

  async run({ toolCall }: ToolRunArgs): Promise<ToolRunResult> {
    const { toolCallId, toolName } = toolCall
    const input = this.inputSchema.safeParse(toolCall.input)
    if (!input.success) {
      return { message: this.buildError(toolCall, `Invalid input: ${input.error.message}`) }
    }

    try {
      const history = await this.fileAccessService.readHistory({ historyId: input.data.targetHistoryId })
      if (!history.blobHash) {
        return { message: this.buildError(toolCall, `The history item does not have a blob hash. Cannot restore content.`) }
      }

      await this.fileAccessService.restoreHistory(input.data.targetHistoryId)
      const restoredDesc = await this.fileAccessService.getDescriptor(history.fileDescriptorId)

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
                type: "text",
                value: `File '${restoredDesc.name}' restored to the version from history ID ${input.data.targetHistoryId}.`,
              },
            },
            { type: "proceeded-file", blobHash: restoredDesc.blobHash, descId: restoredDesc.id, mimeType: restoredDesc.mimeType },
          ],
        },
      }
    } catch (e) {
      if (e instanceof NotFoundError) {
        return { message: this.buildError(toolCall, `History not found: ${input.data.targetHistoryId}`) }
      }
      return { message: this.buildError(toolCall, `Failed to restore file: ${e instanceof Error ? e.message : String(e)}`) }
    }
  }
}
