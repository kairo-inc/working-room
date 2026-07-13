import { DomainOauthClientSlack } from "@wr/shared"

import { EntityOauthClientSlack } from "../entities"

export const mapOauthClientSlackEntityToDomain = (entity: EntityOauthClientSlack): DomainOauthClientSlack => {
  return {
    id: entity.id,
    createdAt: entity.createdAt,
    updatedAt: entity.updatedAt,
    accessToken: entity.accessToken,
    refreshToken: entity.refreshToken,
    scope: entity.scope,
    slackTeamId: entity.slackTeamId,
    slackTeamName: entity.slackTeamName,
    slackUserId: entity.slackUserId,
    userId: entity.userId,
  }
}
