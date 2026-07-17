import { inject, injectable } from "tsyringe"
import z from "zod"

import { IntegrationContext, SlackClient } from "@wr/integration"
import { BadRequestError, DomainMessageContentToolCall, DomainToolType } from "@wr/shared"
import { randomId } from "@wr/shared-node"

import { Tool, ToolIncomingChange, ToolRunArgs, ToolRunResult } from "../base"

const inputSchema = z.object({
  channelId: z
    .string()
    .describe(
      "The ID of the Slack channel or direct-message conversation containing the message to react to (e.g. C0123456789), not its display name. If you do not already know it, use ToolSlackListChannels first."
    ),
  timestamp: z
    .string()
    .describe(
      "The `ts` timestamp of the message to react to, as returned by ToolSlackListMessages or ToolSlackSendMessage — never guess it."
    ),
  emojiName: z.string().describe("The name of the emoji to react with, without surrounding colons (e.g. `thumbsup`, not `:thumbsup:`)."),
})

@injectable()
export class ToolSlackAddReaction extends Tool {
  name = "ToolSlackAddReaction"
  description =
    "Add an emoji reaction to an existing Slack message, on behalf of the connected User. Requires the message's channel ID and `ts` timestamp — never guess either; find them via ToolSlackListMessages or ToolSlackSendMessage first."
  needApproval = true
  inputSchema = inputSchema
  toolType: DomainToolType = "create"

  constructor(
    @inject("IntegrationContext") private readonly integrationContext: IntegrationContext,
    @inject("SlackClient") private slackClient: SlackClient
  ) {
    super()
  }

  public shouldBeListedInToolList(): boolean {
    return !!this.integrationContext.slack?.get()
  }

  public async getChangeDescription(toolCall: DomainMessageContentToolCall): Promise<ToolIncomingChange> {
    const input = this.inputSchema.safeParse(toolCall.input)
    if (!input.success) {
      throw new BadRequestError(`Invalid input: ${input.error.message}`)
    }
    // Resolve the channel and target message to human-readable context, since a raw ID/timestamp is meaningless to the User reviewing the approval.
    const [channel, message] = await Promise.all([
      this.slackClient.getChannel({ channelId: input.data.channelId }),
      this.slackClient.getMessage({ channelId: input.data.channelId, timestamp: input.data.timestamp }),
    ])
    const location = channel.isIm ? `Direct message with: ${channel.name}` : `Channel: #${channel.name}`
    const target = message ? `"${message.text}"` : `message at ${input.data.timestamp}`
    return { change: `+${location}\n+React :${input.data.emojiName}: to: ${target}` }
  }

  async run({ toolCall }: ToolRunArgs): Promise<ToolRunResult> {
    const { toolCallId, toolName } = toolCall
    const input = this.inputSchema.safeParse(toolCall.input)
    if (!input.success) {
      return { message: this.buildError(toolCall, `Invalid input: ${input.error.message}`) }
    }

    try {
      await this.slackClient.addReaction({
        channelId: input.data.channelId,
        timestamp: input.data.timestamp,
        emojiName: input.data.emojiName,
      })
      return {
        message: {
          id: randomId(),
          role: "tool",
          content: [
            {
              type: "tool-result",
              toolCallId,
              toolName,
              output: { type: "text", value: `Added :${input.data.emojiName}: reaction to the message.` },
            },
          ],
        },
      }
    } catch (e) {
      return { message: this.buildError(toolCall, `Failed to add reaction: ${e instanceof Error ? e.message : String(e)}`) }
    }
  }
}
