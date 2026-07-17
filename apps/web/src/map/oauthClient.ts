import { EntityOauthClientSlack } from "@wr/db"

import { AppOauthClientSlack } from "../types/oauthClient"

export const mapOauthClientSlackEntityToApp = (oauthClient: EntityOauthClientSlack): AppOauthClientSlack => {
  return {
    id: oauthClient.id,
    provider: "slack",
    createdAt: oauthClient.createdAt,
    updatedAt: oauthClient.updatedAt,
    slackTeamId: oauthClient.slackTeamId,
    slackTeamName: oauthClient.slackTeamName,
  }
}
