import { inject, injectable } from "tsyringe"
import z from "zod"

import { IntegrationContext, SlackClient } from "@wr/integration"
import { DomainToolType } from "@wr/shared"
import { randomId } from "@wr/shared-node"

import { Tool, ToolRunArgs, ToolRunResult } from "../base"

const MAX_TAKE = 100
const DEFAULT_TAKE = 50

const inputSchema = z.object({
  cursor: z.string().optional().describe("The cursor for pagination. If provided, the list will start from this cursor."),
  take: z
    .number()
    .optional()
    .describe(
      `The maximum number of items to retrieve. Defaults to ${DEFAULT_TAKE}. The maximum allowed value is ${MAX_TAKE} to prevent overwhelming the response.`
    ),
})

@injectable()
export class ToolSlackListChannels extends Tool {
  name = "ToolSlackListChannels"
  description =
    "List the channels in a Slack workspace, as well as the connected User's existing direct-message conversations. Use this to find the conversation ID to pass to ToolSlackSendMessage, whether posting to a channel or replying in an existing DM."
  needApproval = false
  inputSchema = inputSchema
  toolType: DomainToolType = "read"

  constructor(
    @inject("IntegrationContext") private readonly integrationContext: IntegrationContext,
    @inject("SlackClient") private slackClient: SlackClient
  ) {
    super()
  }

  public shouldBeListedInToolList(): boolean {
    return !!this.integrationContext.slack?.get()
  }

  async run({ toolCall }: ToolRunArgs): Promise<ToolRunResult> {
    const { toolCallId, toolName } = toolCall
    const input = this.inputSchema.safeParse(toolCall.input)
    if (!input.success) {
      return { message: this.buildError(toolCall, `Invalid input: ${input.error.message}`) }
    }

    try {
      const take = input.data.take ?? DEFAULT_TAKE
      const cursor = input.data.cursor ?? undefined
      const result = await this.slackClient.listChannels({ take, cursor })

      let resultMessage = `Channels:\n`
      for (const channel of result.data) {
        if (channel.isIm) {
          resultMessage += `- Direct message with ${channel.name} (ID: ${channel.id})\n`
        } else {
          resultMessage += `- ${channel.name} (ID: ${channel.id}), isPrivate: ${channel.isPrivate}\n`
        }
      }
      if (result.nextCursor) {
        resultMessage += `Next cursor: ${result.nextCursor}\n`
      }

      return {
        message: {
          id: randomId(),
          role: "tool",
          content: [{ type: "tool-result", toolCallId, toolName, output: { type: "text", value: resultMessage } }],
        },
      }
    } catch (e) {
      return { message: this.buildError(toolCall, `Failed to list channels: ${e instanceof Error ? e.message : String(e)}`) }
    }
  }
}
