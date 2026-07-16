import { inject, injectable } from "tsyringe"
import z from "zod"

import { IntegrationContext, SlackClient } from "@wr/integration"
import { DomainToolType } from "@wr/shared"
import { randomId } from "@wr/shared-node"

import { Tool, ToolRunArgs, ToolRunResult } from "../base"

const inputSchema = z.object({})

@injectable()
export class ToolSlackDescribeMySelf extends Tool {
  name = "ToolSlackDescribeMySelf"
  description =
    "Get the connected User's own Slack identity (their Slack user ID and display name). Use this to find their own user ID, for example to locate their self-DM conversation in ToolSlackListChannels's results when you need to send them a note to themselves."
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

    try {
      const self = await this.slackClient.describeSelf()
      return {
        message: {
          id: randomId(),
          role: "tool",
          content: [
            {
              type: "tool-result",
              toolCallId,
              toolName,
              output: { type: "text", value: `You are ${self.name} (ID: ${self.id}).` },
            },
          ],
        },
      }
    } catch (e) {
      return { message: this.buildError(toolCall, `Failed to get your Slack identity: ${e instanceof Error ? e.message : String(e)}`) }
    }
  }
}
