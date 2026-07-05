import { inject, injectable } from "tsyringe"
import z from "zod"

import { FileAccessService } from "@wr/access"
import { DomainFileDescriptor, DomainMessageContentProceededFile, DomainToolType, NotFoundError } from "@wr/shared"
import { randomId } from "@wr/shared-node"

import { FileDescriptorSortByList } from "../../../db/src/entities"
import { fileDescriptorToMessageContent } from "../prompt/file"
import { Tool, ToolRunArgs, ToolRunResult } from "./base"

const MAX_TAKE = 100
const DEFAULT_TAKE = 30

const inputSchema = z.object({
  targetDescId: z
    .string()
    .optional()
    .describe(`The ID of the directory to list. If you need to access the root directory, do not provide this field.`),
  page: z.number().optional().describe("The page number to retrieve. Defaults to 0 because the first page is 0."),
  sortBy: z.enum(FileDescriptorSortByList).optional().describe("The field to sort the results by. Defaults to 'name'."),
  sortDirection: z.enum(["asc", "desc"]).optional().describe("The direction to sort the results. Defaults to 'asc'."),
  take: z
    .number()
    .optional()
    .describe(
      `The maximum number of items to retrieve. Defaults to ${DEFAULT_TAKE}. The maximum allowed value is ${MAX_TAKE} to prevent overwhelming the response.`
    ),
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

      const take = input.data.take ?? DEFAULT_TAKE
      const page = input.data.page ?? 0
      const sortBy = input.data.sortBy ?? "name"
      const sortDirection = input.data.sortDirection ?? "asc"
      const maxItemsInPage = Math.min(take, MAX_TAKE) // Limit to MAX_TAKE items to prevent overwhelming the response
      const files = await this.fileAccessService.list({ descId: desc.id, take: maxItemsInPage, page, sortBy, sortDirection })

      // Construct the result message and file content
      let resultMessage = `Found ${files.count} items in the directory '${desc.name}' (ID: ${desc.id}). Showing page ${page} with up to ${maxItemsInPage} items per page.`
      if (files.nextPage) {
        resultMessage += `\nThere are more items available. The next page is ${files.nextPage}. You can specify the 'page' parameter to retrieve the next set of items.`
      } else {
        resultMessage += `\nThis is the last page of results.`
      }

      const proceededFiles: DomainMessageContentProceededFile[] = []
      resultMessage += "\n\nList of items:\n"
      for (const file of files.data) {
        resultMessage += fileDescriptorToMessageContent(file) + "\n"
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
          content: [{ type: "tool-result", toolCallId, toolName, output: { type: "text", value: resultMessage } }, ...proceededFiles],
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
