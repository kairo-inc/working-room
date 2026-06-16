import { inject, injectable } from "tsyringe"
import z from "zod"

import { FileAccessService } from "@wr/access"
import {
  AlreadyExistsError,
  BadRequestError,
  DomainFileDescriptor,
  DomainMessageContentToolCall,
  DomainToolType,
  supportedTextMimeTypes,
} from "@wr/shared"
import { randomId } from "@wr/shared-node"

import { fileDescriptorToMessageContent } from "../prompt/file"
import { Tool, ToolIncomingChange, ToolRunArgs, ToolRunResult } from "./base"

const inputSchema = z.object({
  parentDescId: z
    .string()
    .optional()
    .describe(
      `The ID of the parent directory where the new file will be created. This should be a directory that the agent has access to.
If you need to refer to the root directory, do not provide this field.`
    ),
  fileName: z.string().describe(`The name of the new file to be created.`),
  content: z.string().describe("The text content to write to the new file."),
  mimeType: z
    .enum(supportedTextMimeTypes)
    .describe(
      `The MIME type of the file content. This should be one of the supported text MIME types: ${supportedTextMimeTypes.join(", ")}.`
    ),
})

@injectable()
export class ToolWriteNewFile extends Tool {
  name = "ToolWriteNewFile"
  description = `Write content to a new file. Use this when you need to create and save information to new files.
This tool will throw an error if a file already exists at the specified path, so please make sure to provide a unique path for the new file.`
  needApproval = true
  inputSchema = inputSchema
  toolType: DomainToolType = "create"

  constructor(@inject("FileAccessService") private fileAccessService: FileAccessService) {
    super()
  }

  public async getChangeDescription(toolCall: DomainMessageContentToolCall): Promise<ToolIncomingChange> {
    const input = this.inputSchema.safeParse(toolCall.input)
    if (!input.success) {
      throw new BadRequestError(`Invalid input: ${input.error.message}`)
    }

    let desc: DomainFileDescriptor
    if (input.data.parentDescId) {
      desc = await this.fileAccessService.getDescriptor(input.data.parentDescId)
    } else {
      desc = await this.fileAccessService.rootDescriptor()
    }
    const parentReadablePath = await this.fileAccessService.buildReadablePath(desc.id)
    const contentLines = input.data.content.split("\n").map((line) => `+${line}`)

    return {
      files: [
        {
          descId: desc.id,
          mimeType: desc.mimeType,
          path: `${parentReadablePath}/${input.data.fileName}`,
        },
      ],
      change: contentLines.join("\n"),
    }
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
      let parentDesc: DomainFileDescriptor
      if (input.data.parentDescId && input.data.parentDescId.trim() !== "") {
        parentDesc = await this.fileAccessService.getDescriptor(input.data.parentDescId)
      } else {
        parentDesc = await this.fileAccessService.rootDescriptor()
      }

      const resultFileDescriptor = await this.fileAccessService.writeFileNew({
        parentDescId: parentDesc.id,
        fileName: input.data.fileName,
        content: new TextEncoder().encode(input.data.content).buffer,
        mimeType: input.data.mimeType,
      })
      return {
        message: {
          id: randomId(),
          role: "tool",
          content: [
            { type: "tool-result", toolCallId, toolName, output: { type: "text", value: "File created successfully." } },
            {
              type: "tool-result",
              toolCallId,
              toolName,
              output: {
                type: "text",
                value: fileDescriptorToMessageContent(resultFileDescriptor),
              },
            },
            {
              type: "proceeded-file",
              blobHash: resultFileDescriptor.blobHash,
              descId: resultFileDescriptor.id,
              mimeType: resultFileDescriptor.mimeType,
            },
          ],
        },
      }
    } catch (e) {
      if (e instanceof AlreadyExistsError) {
        return {
          message: this.buildError(
            toolCall,
            `File already exists at path: ${input.data.fileName}. You can either choose a different path or use other editing tools to modify the existing file.`
          ),
        }
      }
      return {
        message: this.buildError(toolCall, `Failed to create file: ${(e as Error).message}`),
      }
    }
  }
}
