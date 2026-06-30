import { inject, injectable } from "tsyringe"
import z from "zod"

import { FileAccessService } from "@wr/access"
import { DomainFileDescriptor, DomainMessageContentProceededFile, DomainToolType, NotFoundError } from "@wr/shared"
import { randomId } from "@wr/shared-node"

import { fileDescriptorToMessageContent } from "../prompt/file"
import { Tool, ToolRunArgs, ToolRunResult } from "./base"

const MAX_ITEMS = 100
const DEFAULT_ITEMS = 30

const inputSchema = z.object({
  targetDescId: z
    .string()
    .optional()
    .describe(`The ID of the directory to traverse. If you need to access the root directory, do not provide this field.`),
  maxDepth: z
    .number()
    .optional()
    .describe(
      "The maximum depth to traverse. Defaults to 0, which means only the specified directory will be listed. A value of 1 will include the contents of subdirectories, and so on."
    ),
  maxItems: z
    .number()
    .optional()
    .describe(
      `The maximum number of items to retrieve. Defaults to ${DEFAULT_ITEMS}. The maximum allowed value is ${MAX_ITEMS} to prevent overwhelming the response.`
    ),
})

@injectable()
export class ToolTraverseDir extends Tool {
  name = "ToolTraverseDir"
  description = "Traverse the contents of a directory. Use this when you need to explore the file system recursively."
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

      const maxDepth = input.data.maxDepth ?? 0
      const maxItems = input.data.maxItems ?? DEFAULT_ITEMS
      const maxItemsInPage = Math.min(maxItems, MAX_ITEMS) // Limit to MAX_ITEMS items to prevent overwhelming the response
      const files = await this.fileAccessService.traverse({ descId: desc.id, maxDepth, maxItems: maxItemsInPage })

      // Construct the result message and file content
      let fileContent = ""
      let resultMessage = `Found ${files.length} items under the directory '${desc.name}' (ID: ${desc.id}) up to a depth of ${maxDepth}. Showing up to ${maxItemsInPage} items.`

      const proceededFiles: DomainMessageContentProceededFile[] = []
      for (const file of files) {
        fileContent += fileDescriptorToMessageContent(file) + "\n"
        if (depth === 0) {
          proceededFiles.push({
            type: "proceeded-file",
            descId: file.id,
            blobHash: file.blobHash,
            mimeType: file.mimeType,
          })
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
      return { message: this.buildError(toolCall, `Failed to traverse directory: ${e instanceof Error ? e.message : String(e)}`) }
    }
  }
}
