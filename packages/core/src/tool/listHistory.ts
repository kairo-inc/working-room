import { inject, injectable } from "tsyringe"
import z from "zod"

import { FileAccessService } from "@wr/access"
import { DomainMessageContentProceededFile, DomainToolType, NotFoundError } from "@wr/shared"
import { randomId } from "@wr/shared-node"

import { FileHistorySortByList } from "../../../db/src/entities"
import { Tool, ToolRunArgs, ToolRunResult } from "./base"

const MAX_TAKE = 100
const DEFAULT_TAKE = 30

const inputSchema = z.object({
  targetDescId: z.string().describe(`The ID of the file descriptor to list the history for.`),
  page: z.number().optional().describe("The page number to retrieve. Defaults to 0 because the first page is 0."),
  sortBy: z.enum(FileHistorySortByList).optional().describe("The field to sort the results by. Defaults to 'createdAt'."),
  sortDirection: z.enum(["asc", "desc"]).optional().describe("The direction to sort the results. Defaults to 'desc'."),
  take: z
    .number()
    .optional()
    .describe(
      `The maximum number of items to retrieve. Defaults to ${DEFAULT_TAKE}. The maximum allowed value is ${MAX_TAKE} to prevent overwhelming the response.`
    ),
})

@injectable()
export class ToolListHistory extends Tool {
  name = "ToolListHistory"
  description = `List the history of a file descriptor. Use this to retrieve a brief overview of the changes made to a file over time, including the number of versions and their metadata.
When you want to view the specific content of a file at a certain point in its history, use the ToolReadFileHistory tool instead.`

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
      const desc = await this.fileAccessService.getDescriptor(input.data.targetDescId)
      if (desc.isDirectory) {
        return { message: this.buildError(toolCall, `The target descriptor is a directory. Please provide a file descriptor ID.`) }
      }

      const take = input.data.take ?? DEFAULT_TAKE
      const page = input.data.page ?? 0
      const sortBy = input.data.sortBy ?? "createdAt"
      const sortDirection = input.data.sortDirection ?? "desc"
      const maxItemsInPage = Math.min(take, MAX_TAKE) // Limit to MAX_TAKE items to prevent overwhelming the response
      const historyItems = await this.fileAccessService.listFileHistory({
        descId: desc.id,
        take: maxItemsInPage,
        page,
        sortBy,
        sortDirection,
      })

      // Construct the result message and file content
      let resultMessage = `Found ${historyItems.count} history items for '${desc.name}' (ID: ${desc.id}). Showing page ${page} with up to ${maxItemsInPage} items per page.`
      if (historyItems.nextPage) {
        resultMessage += `\nThere are more items available. The next page is ${historyItems.nextPage}. You can specify the 'page' parameter to retrieve the next set of items.`
      } else {
        resultMessage += `\nThis is the last page of results.`
      }

      const proceededFiles: DomainMessageContentProceededFile[] = []
      if (depth === 0) {
        proceededFiles.push({
          type: "proceeded-file",
          descId: desc.id,
          blobHash: desc.blobHash,
          mimeType: desc.mimeType,
        })
      }

      for (const history of historyItems.data) {
        // Drop seconds and milliseconds from the timestamp for better readability
        const utcCreatedAt = new Date(history.createdAt).toISOString().replace(/:\d{2}\.\d{3}Z$/, "Z") // Remove seconds and milliseconds
        resultMessage += `\n- [${utcCreatedAt}] History ID: ${history.id} - ${history.operation} by ${history.user?.name ?? "Unknown"} (${history.user?.email ?? "Unknown"})`
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
        return { message: this.buildError(toolCall, `History not found: ${input.data.targetDescId}`) }
      }
      return { message: this.buildError(toolCall, `Failed to list history: ${e instanceof Error ? e.message : String(e)}`) }
    }
  }
}
