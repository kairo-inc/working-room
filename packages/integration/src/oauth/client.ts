import { OAuthTokenExchangeError } from "@wr/shared"

import { OAuth2ProviderConfig } from "./types"

type RawTokenResponse = Record<string, unknown> & {
  access_token?: string
  refresh_token?: string
  expires_in?: number
  scope?: string
  token_type?: string
  error?: string
  error_description?: string
}

export const buildAuthorizationUrl = (config: OAuth2ProviderConfig, args: { state: string; codeChallenge: string }): string => {
  const url = new URL(config.authorizationUrl)
  url.searchParams.set("client_id", config.clientId)
  url.searchParams.set("redirect_uri", config.redirectUri)
  url.searchParams.set("response_type", "code")
  // Some providers (e.g. Slack) reject a request that includes an empty `scope` param when the
  // redirect_uri is treated as "non-web", so omit it entirely rather than sending `scope=`.
  if (config.scopes.length > 0) {
    url.searchParams.set("scope", config.scopes.join(config.scopeSeparator ?? " "))
  }
  url.searchParams.set("state", args.state)
  url.searchParams.set("code_challenge", args.codeChallenge)
  url.searchParams.set("code_challenge_method", "S256")
  if (config.extraParams) {
    for (const [key, value] of Object.entries(config.extraParams)) {
      url.searchParams.set(key, value)
    }
  }
  return url.toString()
}

const requestToken = async (config: OAuth2ProviderConfig, body: Record<string, string>): Promise<Record<string, unknown>> => {
  let response: Response
  try {
    response = await fetch(config.tokenUrl, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded", Accept: "application/json" },
      body: new URLSearchParams(body),
    })
  } catch (e) {
    throw new OAuthTokenExchangeError(`Failed to reach the token endpoint: ${e instanceof Error ? e.message : String(e)}`)
  }

  let raw: RawTokenResponse
  try {
    raw = await response.json()
  } catch {
    throw new OAuthTokenExchangeError("Received a malformed response from the token endpoint.")
  }

  if (!response.ok || raw.error) {
    throw new OAuthTokenExchangeError(raw.error_description ?? raw.error ?? `Token endpoint returned status ${response.status}.`)
  }
  return raw
}

export const exchangeCodeForToken = async (
  config: OAuth2ProviderConfig,
  args: { code: string; codeVerifier: string }
): Promise<Record<string, unknown>> => {
  return requestToken(config, {
    grant_type: "authorization_code",
    client_id: config.clientId,
    redirect_uri: config.redirectUri,
    code: args.code,
    ...(config.sendClientSecretInTokenExchange === false ? {} : { client_secret: config.clientSecret }),
    ...(config.sendCodeVerifierInTokenExchange === false ? {} : { code_verifier: args.codeVerifier }),
  })
}

export const refreshAccessToken = async (
  config: OAuth2ProviderConfig,
  args: { refreshToken: string }
): Promise<Record<string, unknown>> => {
  return requestToken(config, {
    grant_type: "refresh_token",
    client_id: config.clientId,
    refresh_token: args.refreshToken,
    ...(config.sendClientSecretInTokenExchange === false ? {} : { client_secret: config.clientSecret }),
  })
}
