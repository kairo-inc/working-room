import { inject, injectable } from "tsyringe"

import { OauthClientSlackSource } from "@wr/db"
import { NotFoundError } from "@wr/shared"

import { IntegrationContext } from "../types"
import { parseSlackTokenResponse, refreshSlackAccessToken } from "./providers/slack"
import { OauthCallbackArgs, OauthRefreshTokenArgs, OauthRefreshTokenResult, OauthService } from "./serviceType"

const callbackUrl = (provider: string, baseUrl: string): string => {
  return `${baseUrl}/api/oauth/${provider}/callback`
}

@injectable()
export class OauthServiceImpl extends OauthService {
  constructor(
    @inject("IntegrationContext") private readonly context: IntegrationContext,
    @inject("OauthClientSlackSource") private readonly oauthClientSlackSource: OauthClientSlackSource
  ) {
    super()
  }

  async handleOauthCallback(args: OauthCallbackArgs): Promise<void> {
    const { provider, token, userId } = args
    switch (provider) {
      case "slack": {
        const { accessToken, refreshToken, scope, teamId, teamName, id: slackUserId } = parseSlackTokenResponse(token)
        await this.oauthClientSlackSource.upsert({
          where: { userId_slackTeamId: { userId, slackTeamId: teamId } },
          create: {
            user: { connect: { id: userId } },
            slackTeamId: teamId,
            slackTeamName: teamName,
            slackUserId: slackUserId,
            accessToken,
            refreshToken,
            scope,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
          update: {
            accessToken,
            refreshToken,
            slackTeamId: teamId,
            slackTeamName: teamName,
            slackUserId: slackUserId,
            scope,
            updatedAt: new Date(),
          },
        })
        break
      }
    }
  }

  async refreshToken(args: OauthRefreshTokenArgs): Promise<OauthRefreshTokenResult> {
    const { id, provider } = args
    const redirectUrl = callbackUrl(provider, this.context.serverConfig.baseUrl)
    switch (provider) {
      case "slack": {
        const record = await this.oauthClientSlackSource.findIfExists("EntityOauthClientSlack", {
          where: { id },
        })
        if (!record) {
          throw new NotFoundError("Refresh token not found.")
        }
        const data = await refreshSlackAccessToken(redirectUrl, { refreshToken: record.refreshToken })
        await this.oauthClientSlackSource.update({
          where: { id: record.id },
          data: {
            accessToken: data.accessToken,
            refreshToken: data.refreshToken,
            scope: data.scope,
            updatedAt: new Date(),
          },
        })
        return { accessToken: data.accessToken }
      }
    }
    throw new NotFoundError(`Provider ${provider} not supported for token refresh.`)
  }
}
