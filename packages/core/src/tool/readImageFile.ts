import { inject, injectable } from "tsyringe"
import z from "zod"

import { FileAccessService } from "@wr/access"
import { DomainToolType, ImageMimeType } from "@wr/shared"
import { randomId } from "@wr/shared-node"

import { Tool, ToolRunArgs, ToolRunResult } from "./base"

const inputSchema = z.object({
  descId: z
    .string()
    .describe(
      `ID of the image file to read. This can be obtained from the file reference returned by the tool that created or accessed the file.`
    ),
})

@injectable()
export class ToolReadImageFile extends Tool {
  name = "ToolReadImageFile"
  description = "Read the content of an image file. Use this when you need to extract information from image files."
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
      })
      const base64Content = Buffer.from(fileContent).toString("base64")
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
                type: "image",
                image: base64Content,
                mediaType: targetFileDescriptor.mimeType as ImageMimeType,
                descId: targetFileDescriptor.id,
              },
            },
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
