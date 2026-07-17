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
      "The ID of the Slack channel or direct-message conversation containing the message to remove the reaction from (e.g. C0123456789), not its display name. If you do not already know it, use ToolSlackListChannels first."
    ),
  timestamp: z
    .string()
    .describe(
      "The `ts` timestamp of the message to remove the reaction from, as returned by ToolSlackListMessages or ToolSlackSendMessage — never guess it."
    ),
  emojiName: z
    .string()
    .describe("The name of the emoji reaction to remove, without surrounding colons (e.g. `thumbsup`, not `:thumbsup:`)."),
})

@injectable()
export class ToolSlackRemoveReaction extends Tool {
  name = "ToolSlackRemoveReaction"
  description =
    "Remove an emoji reaction the connected User previously added to a Slack message. Requires the message's channel ID and `ts` timestamp — never guess either; find them via ToolSlackListMessages or ToolSlackSendMessage first."
  needApproval = true
  inputSchema = inputSchema
  toolType: DomainToolType = "delete"

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
    return { change: `-${location}\n-Remove :${input.data.emojiName}: from: ${target}` }
  }

  async run({ toolCall }: ToolRunArgs): Promise<ToolRunResult> {
    const { toolCallId, toolName } = toolCall
    const input = this.inputSchema.safeParse(toolCall.input)
    if (!input.success) {
      return { message: this.buildError(toolCall, `Invalid input: ${input.error.message}`) }
    }

    try {
      await this.slackClient.removeReaction({
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
              output: { type: "text", value: `Removed :${input.data.emojiName}: reaction from the message.` },
            },
          ],
        },
      }
    } catch (e) {
      return { message: this.buildError(toolCall, `Failed to remove reaction: ${e instanceof Error ? e.message : String(e)}`) }
    }
  }
}
