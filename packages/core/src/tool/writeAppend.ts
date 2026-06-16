import { inject, injectable } from "tsyringe"
import z from "zod"

import { FileAccessService } from "@wr/access"
import { BadRequestError, DomainMessageContentToolCall, DomainToolType } from "@wr/shared"
import { randomId } from "@wr/shared-node"

import { Tool, ToolIncomingChange, ToolRunArgs, ToolRunResult } from "./base"

const inputSchema = z.object({
  descId: z.string().describe(`The ID of the existing file to append content to. This should be a file that the agent has access to.`),
  content: z.string().describe("The text content to append to the existing file."),
})

const baseStateSchema = z.object({
  blobHash: z.string().describe("The hash of the file content before modification, used for conflict detection."),
})

@injectable()
export class ToolWriteAppend extends Tool {
  name = "ToolWriteAppend"
  description = `Append content to an existing file. Use this when you need to add information to existing files.
This tool will throw an error if the file does not exist at the specified path, so please make sure the file exists before using this tool.`
  needApproval = true
  inputSchema = inputSchema
  toolType: DomainToolType = "edit"

  constructor(@inject("FileAccessService") private fileAccessService: FileAccessService) {
    super()
  }

  public async getChangeDescription(toolCall: DomainMessageContentToolCall): Promise<ToolIncomingChange> {
    const input = this.inputSchema.safeParse(toolCall.input)
    if (!input.success) {
      throw new BadRequestError(`Invalid input: ${input.error.message}`)
    }

    const targetDesc = await this.fileAccessService.getDescriptor(input.data.descId)
    const readableFilePath = await this.fileAccessService.buildReadablePath(input.data.descId)
    const { blobHash: afterBlob } = await this.fileAccessService.writeBlobAppend({
      blobHash: targetDesc.blobHash,
      content: input.data.content,
    })
    const diff = await this.fileAccessService.differenceBlob({
      sourceBlobHash: targetDesc.blobHash,
      targetBlobHash: afterBlob,
      filename: targetDesc.name,
    })

    return {
      files: [{ descId: input.data.descId, path: readableFilePath, mimeType: targetDesc.mimeType }],
      change: diff,
    }
  }

  public async getBaseState(toolCall: DomainMessageContentToolCall): Promise<z.infer<typeof baseStateSchema>> {
    const input = this.inputSchema.safeParse(toolCall.input)
    if (!input.success) {
      throw new BadRequestError(`Invalid input: ${input.error.message}`)
    }
    const targetFileDescriptor = await this.fileAccessService.getDescriptor(input.data.descId)
    const { blobHash } = targetFileDescriptor
    return { blobHash }
  }

  async run({ toolCall }: ToolRunArgs): Promise<ToolRunResult> {
    const { toolCallId, toolName, baseState } = toolCall
    const input = this.inputSchema.safeParse(toolCall.input)
    if (!input.success) {
      return {
        message: this.buildError(toolCall, `Invalid input: ${input.error.message}`),
      }
    }

    try {
      const targetFileDescriptor = await this.fileAccessService.getDescriptor(input.data.descId)

      // Check base state for conflict detection
      if (baseState) {
        const parsedBaseState = baseStateSchema.safeParse(baseState)
        if (!parsedBaseState.success) {
          return {
            message: this.buildError(toolCall, `Invalid base state: ${parsedBaseState.error.message}`),
          }
        }
        const { blobHash } = parsedBaseState.data
        if (blobHash !== targetFileDescriptor.blobHash) {
          return {
            message: this.buildError(toolCall, `Conflict detected: the file has been modified since it was last read.`),
          }
        }
      }

      await this.fileAccessService.writeFileAppend({
        id: input.data.descId,
        content: input.data.content,
      })
      return {
        message: {
          id: randomId(),
          role: "tool",
          content: [
            { type: "tool-result", toolCallId, toolName, output: { type: "text", value: "Content appended successfully." } },
            {
              type: "proceeded-file",
              blobHash: targetFileDescriptor.blobHash,
              descId: targetFileDescriptor.id,
              mimeType: targetFileDescriptor.mimeType,
            },
          ],
        },
      }
    } catch (e) {
      return {
        message: this.buildError(toolCall, `Failed to write file: ${(e as Error).message}`),
      }
    }
  }
}
