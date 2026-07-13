import { WebClient } from "@slack/web-api"
import { inject, injectable } from "tsyringe"

import { CursorResult, NoContextError, SlackApiErrorNotFound } from "@wr/shared"

import { IntegrationContext } from "../types"
import { SlackChannel, SlackClient, SlackClientDescribeTeamArgs, SlackClientListChannelsArgs, SlackTeam } from "./type"

export * from "./type"

@injectable()
export class SlackClientImpl extends SlackClient {
  constructor(@inject("IntegrationContext") private readonly integrationContext: IntegrationContext) {
    super()
  }

  private getClient(): WebClient {
    if (!this.integrationContext.slack?.get()) {
      throw new NoContextError("Slack access token is not given in the integration context.")
    }
    return new WebClient(this.integrationContext.slack.get())
  }

  async describeTeam(args: SlackClientDescribeTeamArgs): Promise<SlackTeam> {
    const { teamId } = args
    const response = await this.getClient().users.identity({})
    if (!response.team) {
      throw new SlackApiErrorNotFound(`Failed to describe Slack team with ID: ${teamId}`)
    }
    return {
      id: response.team.id!,
      name: response.team.name!,
    }
  }

  async listChannels(args: SlackClientListChannelsArgs): Promise<CursorResult<SlackChannel>> {
    const response = await this.getClient().conversations.list({
      limit: args.take,
      cursor: args.cursor,
      types: "public_channel,private_channel",
    })
    if (!response.ok || !response.channels) {
      throw new SlackApiErrorNotFound("Failed to list Slack channels.")
    }
    const channels = response.channels.map((channel) => ({
      id: channel.id!,
      name: channel.name!,
      isPrivate: channel.is_private ?? false,
    }))
    return {
      data: channels,
      nextCursor: response.response_metadata?.next_cursor || null,
    }
  }
}
