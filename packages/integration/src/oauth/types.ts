export type OAuth2ProviderConfig = {
  provider: string
  authorizationUrl: string
  tokenUrl: string
  clientId: string
  clientSecret: string
  redirectUri: string
  scopes: string[]
  // Separator used to join `scopes` into the authorization request's `scope` param.
  // Defaults to a space, per RFC 6749. Some providers (e.g. Slack) require a comma instead.
  scopeSeparator?: string
  extraParams?: Record<string, string>
  // Whether to include `client_secret` in the token exchange request body. Defaults to true.
  // PKCE is designed to let public clients authenticate without a client secret; set this to
  // false for a provider whose token endpoint rejects client_secret alongside code_verifier.
  sendClientSecretInTokenExchange?: boolean
  // Whether to include `code_verifier` in the token exchange request body. Defaults to true.
  // Set to false for a provider whose token endpoint doesn't validate it correctly (e.g. it
  // rejects a code_verifier that is cryptographically correct for the code_challenge it was
  // sent at the authorize step). Only safe to disable for a confidential client that also sends
  // client_secret, since that already authenticates the token exchange request.
  sendCodeVerifierInTokenExchange?: boolean
}

export type PkcePair = {
  codeVerifier: string
  codeChallenge: string
}

export type OAuth2State = {
  userId: string
  provider: string
  codeChallenge: string
  nonce: string
}

export type TokenResponse = {
  accessToken: string
  refreshToken?: string
  expiresIn?: number
  scope?: string
  tokenType: string
}
