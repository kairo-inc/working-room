import { inject, injectable } from "tsyringe"
import z from "zod"

import { AiModelTier, AiVendorConfigs, DomainToolType } from "@wr/shared"
import { randomId } from "@wr/shared-node"

import { Model } from "../model"
import { Tool, ToolRunArgs, ToolRunResult } from "./base"

const inputSchema = z.object({
  query: z.string().describe("The search query to use for web searching"),
})

@injectable()
export class ToolWebSearch extends Tool {
  name = "ToolWebSearch"
  description =
    "Search the web for the latest information. Use this when you need to get up-to-date information from the web. The input should be a search query, and the output will be a list of relevant search results."
  needApproval = false
  inputSchema = inputSchema
  toolType: DomainToolType = "read"
  defaultTier: AiModelTier = "medium"

  constructor(@inject("AiVendorConfigs") private aiVendorConfigs: AiVendorConfigs) {
    super()
  }

  async run({ toolCall, config }: ToolRunArgs): Promise<ToolRunResult> {
    const aiVendorConfigs = this.aiVendorConfigs
    const { toolCallId, toolName, input } = toolCall
    const parsed = inputSchema.safeParse(input)
    if (!parsed.success) {
      return {
        message: this.buildError(toolCall, `Invalid input: ${parsed.error.message}`),
      }
    }

    const tierOverride = config.tierOverrides?.[toolName]
    const model = new Model({
      modelTier: tierOverride ?? this.defaultTier,
      vendorConfigs: aiVendorConfigs,
    })
    try {
      const result = await model.webSearch({ query: parsed.data.query }, { maxRetries: 3, maxOutputTokens: 1024 * 4 })
      return {
        message: {
          id: randomId(),
          role: "tool",
          content: [{ type: "tool-result", toolCallId, toolName, output: { type: "text", value: result.text } }],
        },
        tokens: result.tokens,
      }
    } catch (e) {
      return {
        message: this.buildError(toolCall, `Web search failed: ${(e as Error).message}`),
      }
    }
  }
}
