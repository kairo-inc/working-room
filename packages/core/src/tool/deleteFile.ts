import { inject, injectable } from "tsyringe"
import z from "zod"

import { FileAccessService } from "@wr/access"
import { BadRequestError, DomainMessageContentToolCall, DomainToolType, NotFoundError } from "@wr/shared"
import { randomId } from "@wr/shared-node"

import { Tool, ToolIncomingChange, ToolRunArgs, ToolRunResult } from "./base"

const inputSchema = z.object({
  descIds: z
    .array(z.string())
    .describe(
      "A list of IDs of the files to be deleted. This can be obtained from the file reference returned by the tool that created or accessed the file."
    ),
})

@injectable()
export class ToolDeleteFile extends Tool {
  name = "ToolDeleteFile"
  description = `Delete files from the system. Use this when you need to remove files that are no longer needed.
The input should include the IDs of the files to be deleted.This can be obtained from the file reference returned by the tool that created or accessed the file.
When any directory ids are provided, the tool throws an error since directories should be deleted with the ToolDeleteDir tool to ensure proper handling of their contents. 
If you need to delete a directory, use the ToolDeleteDir tool instead.
`
  needApproval = true
  inputSchema = inputSchema
  toolType: DomainToolType = "delete"

  constructor(@inject("FileAccessService") private fileAccessService: FileAccessService) {
    super()
  }

  public async getChangeDescription(toolCall: DomainMessageContentToolCall): Promise<ToolIncomingChange> {
    const parsed = inputSchema.safeParse(toolCall.input)
    if (!parsed.success) {
      throw new BadRequestError(`Invalid input: ${parsed.error.message}`)
    }
    const descList = await Promise.all(parsed.data.descIds.map((descId) => this.fileAccessService.getDescriptor(descId)))
    const pathList = await Promise.all(descList.map((desc) => this.fileAccessService.buildReadablePath(desc.id)))
    return {
      files: descList.map((desc, index) => ({
        path: pathList[index]!,
        mimeType: desc.mimeType,
        descId: desc.id,
      })),
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
      await this.fileAccessService.deleteMany({ ids: parsed.data.descIds, onlyFiles: true })
      return {
        message: {
          id: randomId(),
          role: "tool",
          content: [
            {
              type: "tool-result",
              toolCallId,
              toolName,
              output: { type: "text", value: `Files deleted: ${parsed.data.descIds.join(", ")}` },
            },
          ],
        },
      }
    } catch (error) {
      if (error instanceof NotFoundError) {
        return {
          message: {
            id: randomId(),
            role: "tool",
            content: [
              {
                type: "tool-result",
                toolCallId,
                toolName,
                output: { type: "text", value: `Files are already deleted: ${parsed.data.descIds.join(", ")}` },
              },
            ],
          },
        }
      }
      return {
        message: this.buildError(toolCall, `Failed to delete file: ${(error as Error).message}`),
      }
    }
  }
}
