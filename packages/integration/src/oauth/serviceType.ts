export type OauthCallbackArgs = {
  provider: string
  token: Record<string, unknown>
  userId: string
}

export type OauthRefreshTokenArgs = {
  provider: string
  // Need access token to identify the user and refresh the token.
  accessToken: string
}

export abstract class OauthService {
  abstract handleOauthCallback(args: OauthCallbackArgs): Promise<void>

  abstract refreshToken(args: OauthRefreshTokenArgs): Promise<void>
  // Shortcut method to refresh the token and update the context store if it exists.
  abstract refreshTokenAndUpdateContext(args: OauthRefreshTokenArgs): Promise<void>
}
