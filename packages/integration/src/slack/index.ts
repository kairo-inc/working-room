import { ErrorCode, WebClient } from "@slack/web-api"
import { inject, injectable } from "tsyringe"

import { CursorResult, NoContextError, SlackApiErrorNotFound } from "@wr/shared"

import { OauthService } from "../oauth/serviceType"
import { IntegrationContext } from "../types"
import { SlackChannel, SlackClient, SlackClientDescribeTeamArgs, SlackClientListChannelsArgs, SlackTeam } from "./type"

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

  async listChannels(args: SlackClientListChannelsArgs): Promise<CursorResult<SlackChannel>> {
    const response = await this.retryable(() =>
      this.getClient().conversations.list({
        limit: args.take,
        cursor: args.cursor,
        types: "public_channel,private_channel",
      })
    )
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
