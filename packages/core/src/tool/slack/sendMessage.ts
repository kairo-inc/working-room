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
      "The ID of the Slack channel or direct-message conversation to send the message to (e.g. C0123456789 for a channel, D0123456789 for a DM), not its display name. This must be an existing conversation's own ID — a Slack user ID does not work here. If you do not already know the ID, use ToolSlackListChannels first to look it up; its results include the User's existing direct-message conversations alongside channels."
    ),
  text: z.string().describe("The text content of the message to send."),
})

@injectable()
export class ToolSlackSendMessage extends Tool {
  name = "ToolSlackSendMessage"
  description =
    "Send a message to a Slack channel or an existing direct-message conversation, on behalf of the connected User. Requires the target conversation's own ID, not a channel name or a user ID — never guess it; call ToolSlackListChannels first to find the correct one."
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
    // Resolve the channel ID to a human-readable name, since a raw ID is meaningless to the User reviewing the approval.
    const channel = await this.slackClient.getChannel({ channelId: input.data.channelId })
    if (channel.isIm) {
      return { change: `+Direct message to: ${channel.name}\n+Message: ${input.data.text}` }
    }
    return { change: `+Channel: #${channel.name}\n+Message: ${input.data.text}` }
  }

  async run({ toolCall }: ToolRunArgs): Promise<ToolRunResult> {
    const { toolCallId, toolName } = toolCall
    const input = this.inputSchema.safeParse(toolCall.input)
    if (!input.success) {
      return { message: this.buildError(toolCall, `Invalid input: ${input.error.message}`) }
    }

    try {
      const result = await this.slackClient.sendMessage({ channelId: input.data.channelId, text: input.data.text })
      return {
        message: {
          id: randomId(),
          role: "tool",
          content: [
            {
              type: "tool-result",
              toolCallId,
              toolName,
              output: { type: "text", value: `Message sent to channel ${result.channel} (ts: ${result.ts}).` },
            },
          ],
        },
      }
    } catch (e) {
      return { message: this.buildError(toolCall, `Failed to send message: ${e instanceof Error ? e.message : String(e)}`) }
    }
  }
}
