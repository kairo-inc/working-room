import { inject, injectable } from "tsyringe"
import z from "zod"

import { IntegrationContext, SlackClient } from "@wr/integration"
import { DomainToolType } from "@wr/shared"
import { randomId } from "@wr/shared-node"

import { Tool, ToolRunArgs, ToolRunResult } from "../base"

const MAX_TAKE = 100
const DEFAULT_TAKE = 50

const inputSchema = z.object({
  channelId: z
    .string()
    .describe(
      "The ID of the Slack channel or direct-message conversation to read messages from (e.g. C0123456789 for a channel, D0123456789 for a DM), not its display name. If you do not already know the ID, use ToolSlackListChannels first to look it up."
    ),
  cursor: z.string().optional().describe("The cursor for pagination. If provided, the list will start from this cursor."),
  take: z
    .number()
    .optional()
    .describe(
      `The maximum number of messages to retrieve. Defaults to ${DEFAULT_TAKE}. The maximum allowed value is ${MAX_TAKE} to prevent overwhelming the response.`
    ),
})

@injectable()
export class ToolSlackListMessages extends Tool {
  name = "ToolSlackListMessages"
  description =
    "Read the recent messages in a Slack channel or an existing direct-message conversation, newest first. Requires the target conversation's own ID, not a channel name — never guess it; call ToolSlackListChannels first to find the correct one."
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

  // Resolves each distinct sender's display name, so the same User is only looked up once even if
  // they sent multiple messages in the returned page.
  private async resolveSenderNames(userIds: (string | null)[]): Promise<Map<string, string>> {
    const uniqueIds = [...new Set(userIds.filter((id): id is string => !!id))]
    const names = new Map<string, string>()
    await Promise.all(
      uniqueIds.map(async (userId) => {
        const user = await this.slackClient.getUser({ userId }).catch(() => null)
        names.set(userId, user?.name ?? userId)
      })
    )
    return names
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
      const result = await this.slackClient.listMessages({ channelId: input.data.channelId, take, cursor })
      const senderNames = await this.resolveSenderNames(result.data.map((message) => message.userId))

      let resultMessage = `Messages (newest first):\n`
      for (const message of result.data) {
        const sender = message.userId ? (senderNames.get(message.userId) ?? message.userId) : "Unknown sender"
        resultMessage += `- [${message.ts}] ${sender}: ${message.text}\n`
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
      return { message: this.buildError(toolCall, `Failed to list messages: ${e instanceof Error ? e.message : String(e)}`) }
    }
  }
}
