import { inject, injectable } from "tsyringe"
import z from "zod"

import { FileAccessService } from "@wr/access"
import { BadRequestError, DomainFileDescriptor, DomainMessageContentToolCall, DomainToolType } from "@wr/shared"
import { randomId } from "@wr/shared-node"

import { Tool, ToolIncomingChange, ToolRunArgs, ToolRunResult } from "./base"

const inputSchema = z.object({
  parentDescId: z
    .string()
    .optional()
    .describe(
      `The ID of the parent directory where the new directory will be created.
This must be a directory that the agent has access to. If you need to refer to the root directory, do not provide this field.`
    ),
  dirName: z.string().describe(`The name of the new directory to be created.`),
})

@injectable()
export class ToolMakeDir extends Tool {
  name = "ToolMakeDir"
  description = `Create a new directory. Use this when you need to organize files into a new folder.
This tool will throw an error if the directory already exists at the specified path, so please make sure the directory does not exist before using this tool.`
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
    const path = await this.fileAccessService.buildReadablePath(desc.id)
    return {
      files: [
        {
          path,
          mimeType: desc.mimeType,
          descId: desc.id,
        },
      ],
      change: `+${input.data.dirName}`,
    }
  }

  async run({ toolCall }: ToolRunArgs): Promise<ToolRunResult> {
    const { toolCallId, toolName } = toolCall
    const input = this.inputSchema.safeParse(toolCall.input)
    if (!input.success) {
      return { message: this.buildError(toolCall, `Invalid input: ${input.error.message}`) }
    }

    try {
      let desc: DomainFileDescriptor
      if (input.data.parentDescId) {
        desc = await this.fileAccessService.getDescriptor(input.data.parentDescId)
      } else {
        desc = await this.fileAccessService.rootDescriptor()
      }

      const dir = await this.fileAccessService.makeDirectory({
        parentDescId: desc.id,
        dirName: input.data.dirName,
      })
      let message = `Directory created successfully`
      message += `\n- ${dir.name}/ (ID: ${dir.id})`

      return {
        message: {
          id: randomId(),
          role: "tool",
          content: [
            {
              type: "tool-result",
              toolCallId,
              toolName,
              output: { type: "text", value: message },
            },
          ],
        },
      }
    } catch (e) {
      console.error((e as Error).stack)
      return {
        message: this.buildError(toolCall, `Failed to create directory: ${(e as Error).message}`),
      }
    }
  }
}
