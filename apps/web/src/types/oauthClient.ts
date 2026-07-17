export type OauthClientProvider = "slack"

type AppOauthClientBase = {
  id: string
  createdAt: Date
  updatedAt: Date
}

export type AppOauthClientSlack = AppOauthClientBase & {
  provider: "slack"
  slackTeamId: string
  slackTeamName: string
}

export type AppOauthClient = AppOauthClientSlack
