import { inject, injectable } from "tsyringe"
import z from "zod"

import { FileAccessService } from "@wr/access"
import { DomainFileDescriptor, DomainMessageContentToolCall, DomainToolType } from "@wr/shared"
import { randomId } from "@wr/shared-node"

import { Tool, ToolIncomingChange, ToolRunArgs, ToolRunResult } from "./base"

const inputSchema = z.object({
  descId: z.string().describe(`The ID of the existing file to be moved. This should be a file or directory that the agent has access to.`),
  parentDescId: z
    .string()
    .optional()
    .describe(
      `The ID of the destination directory where the file will be moved to. This should be a directory that the agent has access to.
If you need to refer to the root directory, do not provide this field.`
    ),
  newName: z.string().optional().describe(`The new name of the file after moving. If not provided, the original name will be kept.`),
})

@injectable()
export class ToolMoveFile extends Tool {
  name = "ToolMoveFile"
  description = `Move a file from one location to another. Use this when you need to reorganize files within the system. The input should include the source and destination IDs.
You can use this tool to rename a file by providing the same directory in both source and destination IDs but with different file names.`
  needApproval = true
  inputSchema = inputSchema
  toolType: DomainToolType = "move"

  constructor(@inject("FileAccessService") private fileAccessService: FileAccessService) {
    super()
  }

  public async getChangeDescription(toolCall: DomainMessageContentToolCall): Promise<ToolIncomingChange> {
    const parsed = inputSchema.safeParse(toolCall.input)
    if (!parsed.success) {
      return
    }
    let destDesc: DomainFileDescriptor
    if (parsed.data.parentDescId) {
      destDesc = await this.fileAccessService.getDescriptor(parsed.data.parentDescId)
    } else {
      destDesc = await this.fileAccessService.rootDescriptor()
    }
    const sourceDesc = await this.fileAccessService.getDescriptor(parsed.data.descId)
    const sourceReadablePath = await this.fileAccessService.buildReadablePath(sourceDesc.id)
    const destParentPath = await this.fileAccessService.buildReadablePath(destDesc.id)
    const change = `+${destParentPath}/${parsed.data.newName ?? sourceDesc.name}`
    return {
      files: [
        {
          path: sourceReadablePath,
          mimeType: sourceDesc.mimeType,
          descId: sourceDesc.id,
        },
      ],
      change,
    }
  }

  async run({ toolCall }: ToolRunArgs): Promise<ToolRunResult> {
    const { toolCallId, toolName, input } = toolCall
    const parsed = inputSchema.safeParse(input)
    if (!parsed.success) {
      return {
        message: this.buildError(toolCall, `Invalid input: ${parsed.error.message}`),
      }
    }

    try {
      const sourceDescriptor = await this.fileAccessService.getDescriptor(parsed.data.descId)
      let destDesc: DomainFileDescriptor
      if (parsed.data.parentDescId) {
        destDesc = await this.fileAccessService.getDescriptor(parsed.data.parentDescId)
      } else {
        destDesc = await this.fileAccessService.rootDescriptor()
      }

      const newDesc = await this.fileAccessService.moveFile({
        descId: parsed.data.descId,
        parentDescId: destDesc.id,
        newName: parsed.data.newName,
      })

      const resultText = `File moved from ${sourceDescriptor.name} to ${newDesc.name}`

      return {
        message: {
          id: randomId(),
          role: "tool",
          content: [
            {
              type: "tool-result",
              toolCallId,
              toolName,
              output: { type: "text", value: resultText },
            },
            { type: "proceeded-file", blobHash: newDesc.blobHash, descId: newDesc.id, mimeType: newDesc.mimeType },
          ],
        },
      }
    } catch (error) {
      return {
        message: this.buildError(toolCall, `Failed to move file: ${(error as Error).message}`),
      }
    }
  }
}
