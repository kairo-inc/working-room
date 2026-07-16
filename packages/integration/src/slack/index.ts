import { ErrorCode, WebClient } from "@slack/web-api"
import { inject, injectable } from "tsyringe"

import { CursorResult, NoContextError, SlackApiErrorNotFound } from "@wr/shared"

import { OauthService } from "../oauth/serviceType"
import { IntegrationContext } from "../types"
import {
  SlackChannel,
  SlackClient,
  SlackClientDescribeTeamArgs,
  SlackClientGetChannelArgs,
  SlackClientGetUserArgs,
  SlackClientListChannelsArgs,
  SlackClientListUsersArgs,
  SlackClientSendMessageArgs,
  SlackMessage,
  SlackTeam,
  SlackUser,
} from "./type"

export * from "./type"

// Slack error codes that mean the access token is no longer valid and should be refreshed.
// See https://docs.slack.dev/reference/scopes/ (auth-related errors) for the full error list.
const TOKEN_EXPIRED_ERRORS = ["token_expired", "invalid_auth"]

@injectable()
export class SlackClientImpl extends SlackClient {
  constructor(
    @inject("OauthService") private readonly oauthService: OauthService,
    @inject("IntegrationContext") private readonly integrationContext: IntegrationContext
  ) {
    super()
  }

  private isTokenExpiredError(error: unknown): boolean {
    if (!(error instanceof Error) || !("code" in error) || error.code !== ErrorCode.PlatformError) {
      return false
    }
    const data = (error as { data?: { error?: string } }).data
    return !!data?.error && TOKEN_EXPIRED_ERRORS.includes(data.error)
  }

  // Runs `fn` (a Slack API call), and if it fails because the access token has expired, refreshes
  // the token via OauthService and retries `fn` once with the refreshed token.
  private async retryable<T>(fn: () => Promise<T>): Promise<T> {
    try {
      return await fn()
    } catch (error) {
      if (!this.isTokenExpiredError(error)) {
        throw error
      }
      const currentStore = this.integrationContext.slack?.get()
      if (!currentStore) {
        throw error
      }
      const { accessToken: refreshedAccessToken } = await this.oauthService.refreshToken({ id: currentStore.id, provider: "slack" })
      this.integrationContext.slack?.setAccessToken(refreshedAccessToken)
      return fn()
    }
  }

  private getClient(): WebClient {
    const slackContext = this.integrationContext.slack?.get()
    if (!slackContext) {
      throw new NoContextError("Slack access token is not given in the integration context.")
    }
    const { accessToken } = slackContext
    return new WebClient(accessToken)
  }

  // Maps a conversation from conversations.list/conversations.info to a SlackChannel. A direct-message
  // conversation (1:1 or group) has no channel name of its own, so its `name` is resolved to its
  // participants' display names instead, falling back to their raw ID(s) if that lookup fails.
  private async mapChannel(channel: {
    id?: string
    name?: string
    is_private?: boolean
    is_im?: boolean
    is_mpim?: boolean
    user?: string
  }): Promise<SlackChannel> {
    if (channel.is_im && channel.user) {
      const user = await this.getUser({ userId: channel.user }).catch(() => null)
      return {
        id: channel.id!,
        name: user?.name ?? channel.user,
        isPrivate: true,
        isIm: true,
      }
    }
    if (channel.is_mpim && channel.id) {
      const members = await this.retryable(() => this.getClient().conversations.members({ channel: channel.id! })).catch(() => null)
      const memberIds = members?.ok ? (members.members ?? []) : []
      const names = await Promise.all(
        memberIds.map((userId) =>
          this.getUser({ userId })
            .then((user) => user.name)
            .catch(() => userId)
        )
      )
      return {
        id: channel.id!,
        name: names.length > 0 ? names.join(", ") : channel.name!,
        isPrivate: true,
        isIm: true,
      }
    }
    return {
      id: channel.id!,
      name: channel.name!,
      isPrivate: channel.is_private ?? false,
      isIm: false,
    }
  }

  async describeTeam(args: SlackClientDescribeTeamArgs): Promise<SlackTeam> {
    const { teamId } = args
    const response = await this.retryable(() => this.getClient().users.identity({}))
    if (!response.team) {
      throw new SlackApiErrorNotFound(`Failed to describe Slack team with ID: ${teamId}`)
    }
    return {
      id: response.team.id!,
      name: response.team.name!,
    }
  }

  async describeSelf(): Promise<SlackUser> {
    // auth.test identifies the connected token's own user, unlike users.identity, without requiring
    // the "Sign in with Slack" identity.basic scope this app deliberately avoids requesting.
    const response = await this.retryable(() => this.getClient().auth.test({}))
    if (!response.ok || !response.user_id) {
      throw new SlackApiErrorNotFound("Failed to identify the connected Slack user.")
    }
    return this.getUser({ userId: response.user_id })
  }

  async listChannels(args: SlackClientListChannelsArgs): Promise<CursorResult<SlackChannel>> {
    const response = await this.retryable(() =>
      this.getClient().conversations.list({
        limit: args.take,
        cursor: args.cursor,
        // "im" and "mpim" include the User's existing 1:1 and group direct-message conversations
        // alongside channels, so a DM can be targeted the same way as a channel — by its own conversation ID.
        types: "public_channel,private_channel,im,mpim",
      })
    )
    if (!response.ok || !response.channels) {
      throw new SlackApiErrorNotFound("Failed to list Slack channels.")
    }
    const channels = await Promise.all(response.channels.map((channel) => this.mapChannel(channel)))
    return {
      data: channels,
      nextCursor: response.response_metadata?.next_cursor || null,
    }
  }

  async listUsers(args: SlackClientListUsersArgs): Promise<CursorResult<SlackUser>> {
    const response = await this.retryable(() =>
      this.getClient().users.list({
        limit: args.take,
        cursor: args.cursor,
      })
    )
    if (!response.ok || !response.members) {
      throw new SlackApiErrorNotFound("Failed to list Slack users.")
    }
    // Exclude bots, deactivated accounts, and the Slackbot pseudo-user, since none of them are valid DM targets for a User.
    const users = response.members
      .filter((member) => !member.deleted && !member.is_bot && member.id !== "USLACKBOT")
      .map((member) => ({
        id: member.id!,
        name: member.real_name || member.name!,
      }))
    return {
      data: users,
      nextCursor: response.response_metadata?.next_cursor || null,
    }
  }

  async getChannel(args: SlackClientGetChannelArgs): Promise<SlackChannel> {
    const response = await this.retryable(() => this.getClient().conversations.info({ channel: args.channelId }))
    if (!response.ok || !response.channel) {
      throw new SlackApiErrorNotFound(`Failed to find Slack channel with ID: ${args.channelId}`)
    }
    return this.mapChannel(response.channel)
  }

  async getUser(args: SlackClientGetUserArgs): Promise<SlackUser> {
    const response = await this.retryable(() => this.getClient().users.info({ user: args.userId }))
    if (!response.ok || !response.user) {
      throw new SlackApiErrorNotFound(`Failed to find Slack user with ID: ${args.userId}`)
    }
    return {
      id: response.user.id!,
      name: response.user.real_name || response.user.name!,
    }
  }

  async sendMessage(args: SlackClientSendMessageArgs): Promise<SlackMessage> {
    const response = await this.retryable(() =>
      this.getClient().chat.postMessage({
        channel: args.channelId,

        text: args.text,
      })
    )
    if (!response.ok || !response.channel || !response.ts) {
      throw new SlackApiErrorNotFound("Failed to send Slack message.")
    }
    return {
      channel: response.channel,
      ts: response.ts,
    }
  }
}
