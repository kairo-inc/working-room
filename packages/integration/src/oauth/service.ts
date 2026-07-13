import { inject, injectable } from "tsyringe"

import { OauthClientSlackSource } from "@wr/db"
import { NotFoundError } from "@wr/shared"

import { IntegrationContext } from "../types"
import { parseSlackTokenResponse, refreshSlackAccessToken } from "./providers/slack"
import { OauthCallbackArgs, OauthRefreshTokenArgs, OauthService } from "./serviceType"

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
            refreshToken: refreshToken!,
            scope: scope!,
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

  async refreshToken(args: OauthRefreshTokenArgs): Promise<void> {
    const { accessToken, provider } = args
    const redirectUrl = callbackUrl(provider, this.context.serverConfig.baseUrl)
    switch (provider) {
      case "slack": {
        const record = await this.oauthClientSlackSource.findIfExists("EntityOauthClientSlack", {
          where: { accessToken },
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
        break
      }
    }
  }

  async refreshTokenAndUpdateContext(args: OauthRefreshTokenArgs): Promise<void> {
    // This ensures that the token is refreshed and updated in the database before updating the context store.
    await this.refreshToken(args)
    const { provider, accessToken } = args
    switch (provider) {
      case "slack": {
        // Appologies for the confusion. The following code snippet is a continuation of the `refreshTokenAndUpdateContext` method in the `OauthServiceImpl` class.
        // It retrieves the updated token record from the database and updates the context store accordingly.
        const record = await this.oauthClientSlackSource.find("EntityOauthClientSlack", {
          where: { accessToken },
        })
        this.context.slack?.set(record.accessToken)
        break
      }
    }
  }
}
