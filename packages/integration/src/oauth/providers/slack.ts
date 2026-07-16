import { ImplementationError, OAuthTokenExchangeError } from "../../../../shared/src/types/error"
import { buildAuthorizationUrl, exchangeCodeForToken, refreshAccessToken } from "../client"
import { OAuth2ProviderConfig, TokenResponse } from "../types"

// The shape of a successfully-parsed Slack token response, once the fields specific to Slack
// (e.g. `team.id`/`team.name`) have been pulled out of TokenResponse.raw. See
// https://docs.slack.dev/reference/methods/oauth.v2.access/ for the underlying response shape.
// Unlike the generic TokenResponse, refreshToken/scope are required here: WorkingRoom persists
// an OauthClientSlack record with non-nullable refreshToken/scope columns, so a response missing
// either is treated as a parse failure rather than silently persisting an incomplete connection.
export type SlackTokenResponse = Omit<TokenResponse, "refreshToken" | "scope"> & {
  id: string
  teamId: string
  teamName: string
  refreshToken: string
  scope: string
}

export type SlackRefreshTokenResponse = Pick<TokenResponse, "accessToken" | "refreshToken" | "scope">

// See https://api.slack.com/authentication/oauth-v2 for details on Slack OAuth2 flow.
//
// NOTE: Slack rejects a plain `http://localhost` redirect_uri as a "non-web" URI once PKCE is
// enabled for the app, which complicates local testing. To test this flow locally, expose the
// dev server through an HTTPS tunnel (e.g. `ngrok http 3000`) and point NEXTAUTH_URL and the
// Slack app's registered Redirect URL at that HTTPS URL instead of localhost.
// NOTE: These must not be mixed with legacy "Sign in with Slack" scopes (identity.basic,
// identity.email, identity.team, etc.) in the same user_scope list — Slack rejects the request
// with "Invalid permissions requested" if SIWS and non-SIWS scopes are combined. team.id and
// authed_user.id are already present in the oauth.v2.access response regardless of scope, so
// SIWS scopes aren't needed just to identify the connecting user/team.
export const defaultSlackOAuthUserScope = ["channels:read", "groups:read", "chat:write", "users:read", "im:read", "mpim:read"]
// Slack forbids bot scopes when the redirect_uri is treated as a "non-web" URI (e.g. local
// development over http), so no bot scopes are requested here — only `user_scope` is used.
export const defaultSlackOAuthBotScope: string[] = []

export const ensureSlackEnvVars = (): void => {
  if (!process.env.SLACK_CLIENT_ID) {
    throw new ImplementationError("Missing SLACK_CLIENT_ID environment variable.")
  }
  if (!process.env.SLACK_CLIENT_SECRET) {
    throw new ImplementationError("Missing SLACK_CLIENT_SECRET environment variable.")
  }
}

export const getSlackOAuthConfig = (redirectUri: string): OAuth2ProviderConfig => {
  ensureSlackEnvVars()
  return {
    provider: "slack",
    authorizationUrl: "https://slack.com/oauth/v2/authorize",
    tokenUrl: "https://slack.com/api/oauth.v2.access",
    clientId: process.env.SLACK_CLIENT_ID!,
    clientSecret: process.env.SLACK_CLIENT_SECRET!,
    redirectUri,
    scopes: defaultSlackOAuthBotScope,
    // Slack expects comma-separated scopes, not the RFC 6749 default of space-separated.
    scopeSeparator: ",",
    extraParams: {
      // Slack requires the 'user' scope to access user information.
      // See https://api.slack.com/authentication/oauth-v2#scopes for details.
      user_scope: defaultSlackOAuthUserScope.join(","),
    },
    // Per https://docs.slack.dev/authentication/using-pkce/, PKCE is only *required* by Slack
    // for a non-web redirect_uri (a custom URI scheme, and in practice also http://localhost);
    // it's optional for a standard https redirect_uri like WorkingRoom's. In testing, sending
    // code_verifier at the token-exchange step reliably failed with invalid_code_verifier even
    // when it was cryptographically correct for the code_challenge sent at the authorize step,
    // so it's omitted here. WorkingRoom is a confidential client (client_secret is still sent),
    // so this does not weaken the exchange's authentication.
    sendCodeVerifierInTokenExchange: false,
  }
}

export const buildSlackAuthorizationUrl = (redirectUri: string, args: { state: string; codeChallenge: string }): string => {
  return buildAuthorizationUrl(getSlackOAuthConfig(redirectUri), args)
}

export const parseSlackTokenResponse = (token: Record<string, unknown>): SlackTokenResponse => {
  const data = token as
    | {
        team?: { id?: string }
        authed_user?: {
          id?: string
          access_token?: string
          token_type?: string
          scope?: string
          expires_in?: number
          refresh_token?: string
        }
      }
    | undefined
  const accessToken = data?.authed_user?.access_token as string | undefined
  const refreshToken = data?.authed_user?.refresh_token as string | undefined
  const expiresIn = data?.authed_user?.expires_in as number | undefined
  const scope = data?.authed_user?.scope as string | undefined
  const tokenType = data?.authed_user?.token_type as string | undefined
  if (!accessToken || !tokenType) {
    throw new OAuthTokenExchangeError("Slack token response is missing access_token or token_type.")
  }
  if (!refreshToken || !scope) {
    // WorkingRoom persists these as non-nullable columns on OauthClientSlack, so treat a
    // response missing either as a failure rather than persisting an incomplete connection.
    throw new OAuthTokenExchangeError("Slack token response is missing refresh_token or scope.")
  }

  const user = data?.authed_user as { id?: string } | undefined
  const team = data?.team as { id?: string; name?: string } | undefined
  if (!team?.id || !user?.id || !team?.name) {
    throw new OAuthTokenExchangeError("Slack token response is missing team information.")
  }
  return {
    accessToken: accessToken,
    refreshToken: refreshToken,
    expiresIn: expiresIn,
    scope: scope,
    tokenType: tokenType,
    teamId: team.id,
    teamName: team.name,
    id: user.id,
  }
}
export const parseSlackRefreshTokenResponse = (token: Record<string, unknown>): SlackRefreshTokenResponse => {
  const data = token as
    | {
        user_id?: string
        access_token?: string
        scope?: string
        refresh_token?: string
      }
    | undefined
  const accessToken = data?.access_token as string | undefined
  const refreshToken = data?.refresh_token as string | undefined
  const scope = data?.scope as string | undefined
  if (!accessToken) {
    throw new OAuthTokenExchangeError("Slack token response is missing access_token.")
  }

  const user = data?.user_id as string | undefined
  if (!user) {
    throw new OAuthTokenExchangeError("Slack token response is missing user information.")
  }
  return {
    accessToken: accessToken,
    refreshToken: refreshToken,
    scope: scope,
  }
}

export const exchangeSlackCode = async (redirectUri: string, args: { code: string; codeVerifier: string }): Promise<SlackTokenResponse> => {
  const token = await exchangeCodeForToken(getSlackOAuthConfig(redirectUri), args)
  return parseSlackTokenResponse(token)
}

export const refreshSlackAccessToken = async (redirectUri: string, args: { refreshToken: string }): Promise<SlackRefreshTokenResponse> => {
  const token = await refreshAccessToken(getSlackOAuthConfig(redirectUri), args)
  return parseSlackRefreshTokenResponse(token)
}
