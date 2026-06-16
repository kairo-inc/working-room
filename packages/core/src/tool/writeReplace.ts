import { inject, injectable } from "tsyringe"
import z from "zod"

import { FileAccessService } from "@wr/access"
import { BadRequestError, DomainMessageContentToolCall, DomainToolType } from "@wr/shared"
import { randomId } from "@wr/shared-node"

import { Tool, ToolIncomingChange, ToolRunArgs, ToolRunResult } from "./base"

const inputSchema = z.object({
  descId: z.string().describe(`The ID of the existing file to replace content. This should be a file that the agent has access to.`),
  oldContent: z.string().describe("The original text content of the existing file before modification, used for difference calculation."),
  newContent: z.string().describe("The new text content to replace the existing file content."),
})

const baseStateSchema = z.object({ blobHash: z.string() })

@injectable()
export class ToolWriteReplace extends Tool {
  name = "ToolWriteReplace"
  description = `Replace part of or the entire content of an existing file. Use this when you need to modify existing files by replacing their content with new content.
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
    const readableFilePath = await this.fileAccessService.buildReadablePath(targetDesc.id)

    // Perform the replacement in a temporary blob to calculate the difference without modifying the actual file.
    const { blobHash: afterBlob } = await this.fileAccessService.writeBlobReplace({
      blobHash: targetDesc.blobHash,
      oldContent: input.data.oldContent,
      newContent: input.data.newContent,
    })

    // Calculate the difference between the original content and the new content using the blob hashes.
    const diff = await this.fileAccessService.differenceBlob({
      sourceBlobHash: targetDesc.blobHash,
      targetBlobHash: afterBlob,
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
      return { message: this.buildError(toolCall, `Invalid input: ${input.error.message}`) }
    }

    try {
      const currentDesc = await this.fileAccessService.getDescriptor(input.data.descId)

      // Check base state for conflict detection
      if (baseState) {
        const parsedBaseState = baseStateSchema.safeParse(baseState)
        if (!parsedBaseState.success) {
          return { message: this.buildError(toolCall, `Invalid base state: ${parsedBaseState.error.message}`) }
        }

        const { blobHash } = parsedBaseState.data
        if (blobHash !== currentDesc.blobHash) {
          return { message: this.buildError(toolCall, `Conflict detected: the file has been modified since it was last read.`) }
        }
      } else {
        return {
          message: this.buildError(
            toolCall,
            `No base state provided for conflict detection. Please provide the base state to ensure safe modification of the file.`
          ),
        }
      }

      const updatedFileDesc = await this.fileAccessService.writeFileReplace({
        id: currentDesc.id,
        oldContent: input.data.oldContent,
        newContent: input.data.newContent,
      })

      return {
        message: {
          id: randomId(),
          role: "tool",
          content: [
            { type: "tool-result", toolCallId, toolName, output: { type: "text", value: "Content replaced successfully." } },
            {
              type: "proceeded-file",
              blobHash: updatedFileDesc.blobHash,
              descId: updatedFileDesc.id,
              mimeType: updatedFileDesc.mimeType,
            },
          ],
        },
      }
    } catch (e) {
      return { message: this.buildError(toolCall, `Failed to write file: ${(e as Error).message}`) }
    }
  }
}
