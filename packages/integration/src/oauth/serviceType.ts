export type OauthCallbackArgs = {
  provider: string
  token: Record<string, unknown>
  userId: string
}

export type OauthRefreshTokenArgs = {
  // This is the id of the OauthClient record in the database, which is used to identify the record to update.
  id: string
  provider: string
}

export type OauthRefreshTokenResult = {
  accessToken: string
}

export abstract class OauthService {
  abstract handleOauthCallback(args: OauthCallbackArgs): Promise<void>
  abstract refreshToken(args: OauthRefreshTokenArgs): Promise<OauthRefreshTokenResult>
}
