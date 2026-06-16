import { inject, injectable } from "tsyringe"
import z from "zod"

import { FileAccessService } from "@wr/access"
import { DomainFileDescriptor, DomainMessageContentProceededFile, DomainToolType, NotFoundError } from "@wr/shared"
import { randomId } from "@wr/shared-node"

import { fileDescriptorToMessageContent } from "../prompt/file"
import { Tool, ToolRunArgs, ToolRunResult } from "./base"

const DEFAULT_MAX_ITEMS = 100

const inputSchema = z.object({
  targetDescId: z
    .string()
    .optional()
    .describe(`The ID of the directory to list. If you need to access the root directory, do not provide this field.`),
  maxDepth: z
    .number()
    .optional()
    .describe(
      "The maximum depth to traverse when listing the directory. 0 means only the specified directory itself (no subdirectories). Default is 0."
    ),
  maxItems: z.number().optional().describe(`The maximum number of items to return. Default is ${DEFAULT_MAX_ITEMS}.`),
})

@injectable()
export class ToolListDir extends Tool {
  name = "ToolListDir"
  description = "List the contents of a directory. Use this when you need to explore the file system."
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
      let desc: DomainFileDescriptor
      if (input.data.targetDescId) {
        desc = await this.fileAccessService.getDescriptor(input.data.targetDescId)
      } else {
        desc = await this.fileAccessService.rootDescriptor()
      }

      const maxItems = input.data.maxItems ?? DEFAULT_MAX_ITEMS
      const files = await this.fileAccessService.list({
        descId: desc.id,
        maxDepth: input.data.maxDepth ?? 0,
        maxItems,
      })
      let count = 0
      let fileContent = ""
      let resultMessage = `Found ${files.count} items. Listing up to ${Math.min(files.count, maxItems)}.\n`

      const proceededFiles: DomainMessageContentProceededFile[] = []

      for (const file of files.data) {
        fileContent += fileDescriptorToMessageContent(file) + "\n"
        if (depth === 0) {
          proceededFiles.push({
            type: "proceeded-file",
            descId: file.id,
            blobHash: file.blobHash,
            mimeType: file.mimeType,
          })
        }

        count++
        if (count >= maxItems) {
          resultMessage += `There are ${files.count - count} more items.\n`
          resultMessage += `Note: The number of items listed is limited to ${maxItems} to prevent overwhelming the response. Please refine your search if you need to see more items.`
          break
        }
      }

      return {
        message: {
          id: randomId(),
          role: "tool",
          content: [
            { type: "tool-result", toolCallId, toolName, output: { type: "text", value: resultMessage } },
            { type: "tool-result", toolCallId, toolName, output: { type: "text", value: fileContent } },
            ...proceededFiles,
          ],
        },
      }
    } catch (e) {
      if (e instanceof NotFoundError) {
        return { message: this.buildError(toolCall, `Directory not found: ${input.data.targetDescId || "root"}`) }
      }
      return { message: this.buildError(toolCall, `Failed to list directory: ${e instanceof Error ? e.message : String(e)}`) }
    }
  }
}
