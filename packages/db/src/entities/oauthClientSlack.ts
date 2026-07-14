import { OauthClientSlack, Prisma } from "@prisma/client"

// EntityOauthClientSlack.
export class EntityOauthClientSlack implements Omit<OauthClientSlack, "deletedAt"> {
  id: string
  createdAt: Date
  updatedAt: Date
  accessToken: string
  refreshToken: string
  scope: string
  slackUserId: string
  slackTeamId: string
  slackTeamName: string
  userId: string

  static select = {
    id: true,
    createdAt: true,
    updatedAt: true,
    accessToken: true,
    refreshToken: true,
    scope: true,
    slackUserId: true,
    slackTeamId: true,
    slackTeamName: true,
    userId: true,
  } as const satisfies Prisma.OauthClientSlackSelect
}

export const OauthClientSlackSortByList = ["createdAt", "updatedAt", "slackTeamName"] as const

export type OauthClientSlackSortBy = (typeof OauthClientSlackSortByList)[number]
