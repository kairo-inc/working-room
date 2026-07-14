import { afterEach, describe, expect, it, vi } from "vitest"

import { OAuthTokenExchangeError } from "@wr/shared"

import { buildAuthorizationUrl, exchangeCodeForToken, refreshAccessToken } from "./client"
import { OAuth2ProviderConfig } from "./types"

const CONFIG: OAuth2ProviderConfig = {
  provider: "test-provider",
  authorizationUrl: "https://provider.example.com/authorize",
  tokenUrl: "https://provider.example.com/token",
  clientId: "client-id",
  clientSecret: "client-secret",
  redirectUri: "https://app.example.com/callback",
  scopes: ["read", "write"],
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe("[Success] buildAuthorizationUrl", () => {
  it("Builds a URL with the expected query parameters", () => {
    const url = new URL(buildAuthorizationUrl(CONFIG, { state: "signed-state", codeChallenge: "the-challenge" }))
    expect(url.origin + url.pathname).toBe("https://provider.example.com/authorize")
    expect(url.searchParams.get("client_id")).toBe("client-id")
    expect(url.searchParams.get("redirect_uri")).toBe("https://app.example.com/callback")
    expect(url.searchParams.get("response_type")).toBe("code")
    expect(url.searchParams.get("scope")).toBe("read write")
    expect(url.searchParams.get("state")).toBe("signed-state")
    expect(url.searchParams.get("code_challenge")).toBe("the-challenge")
    expect(url.searchParams.get("code_challenge_method")).toBe("S256")
  })

  it("Joins scopes with a custom separator when scopeSeparator is set", () => {
    const url = new URL(
      buildAuthorizationUrl({ ...CONFIG, scopeSeparator: "," }, { state: "signed-state", codeChallenge: "the-challenge" })
    )
    expect(url.searchParams.get("scope")).toBe("read,write")
  })

  it("Omits the scope param entirely when scopes is empty", () => {
    const url = new URL(buildAuthorizationUrl({ ...CONFIG, scopes: [] }, { state: "signed-state", codeChallenge: "the-challenge" }))
    expect(url.searchParams.has("scope")).toBe(false)
  })
})

describe("[Success] exchangeCodeForToken", () => {
  it("Returns the token endpoint's parsed JSON response as-is", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ access_token: "at", refresh_token: "rt", expires_in: 3600, scope: "read", token_type: "Bearer" }),
      })
    )
    const result = await exchangeCodeForToken(CONFIG, { code: "auth-code", codeVerifier: "verifier" })
    expect(result).toEqual({ access_token: "at", refresh_token: "rt", expires_in: 3600, scope: "read", token_type: "Bearer" })
  })

  it("Includes client_secret in the request body by default", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ access_token: "at", token_type: "Bearer" }),
    })
    vi.stubGlobal("fetch", fetchMock)
    await exchangeCodeForToken(CONFIG, { code: "auth-code", codeVerifier: "verifier" })
    const body = fetchMock.mock.calls[0]![1].body as URLSearchParams
    expect(body.get("client_secret")).toBe("client-secret")
  })

  it("Omits client_secret when sendClientSecretInTokenExchange is false", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ access_token: "at", token_type: "Bearer" }),
    })
    vi.stubGlobal("fetch", fetchMock)
    const config: OAuth2ProviderConfig = { ...CONFIG, sendClientSecretInTokenExchange: false }
    await exchangeCodeForToken(config, { code: "auth-code", codeVerifier: "verifier" })
    const body = fetchMock.mock.calls[0]![1].body as URLSearchParams
    expect(body.has("client_secret")).toBe(false)
  })

  it("Includes code_verifier in the request body by default", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ access_token: "at", token_type: "Bearer" }),
    })
    vi.stubGlobal("fetch", fetchMock)
    await exchangeCodeForToken(CONFIG, { code: "auth-code", codeVerifier: "verifier" })
    const body = fetchMock.mock.calls[0]![1].body as URLSearchParams
    expect(body.get("code_verifier")).toBe("verifier")
  })

  it("Omits code_verifier when sendCodeVerifierInTokenExchange is false", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ access_token: "at", token_type: "Bearer" }),
    })
    vi.stubGlobal("fetch", fetchMock)
    const config: OAuth2ProviderConfig = { ...CONFIG, sendCodeVerifierInTokenExchange: false }
    await exchangeCodeForToken(config, { code: "auth-code", codeVerifier: "verifier" })
    const body = fetchMock.mock.calls[0]![1].body as URLSearchParams
    expect(body.has("code_verifier")).toBe(false)
  })
})

describe("[Failure] exchangeCodeForToken", () => {
  it("Throws OAuthTokenExchangeError on a non-2xx response", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 400,
        json: async () => ({ error: "invalid_grant", error_description: "Code expired" }),
      })
    )
    await expect(exchangeCodeForToken(CONFIG, { code: "bad-code", codeVerifier: "verifier" })).rejects.toThrow(OAuthTokenExchangeError)
  })

  it("Throws OAuthTokenExchangeError on a malformed JSON response", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => {
          throw new Error("not json")
        },
      })
    )
    await expect(exchangeCodeForToken(CONFIG, { code: "code", codeVerifier: "verifier" })).rejects.toThrow(OAuthTokenExchangeError)
  })

  it("Throws OAuthTokenExchangeError when the network request itself fails", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("network down")))
    await expect(exchangeCodeForToken(CONFIG, { code: "code", codeVerifier: "verifier" })).rejects.toThrow(OAuthTokenExchangeError)
  })
})

describe("[Success] refreshAccessToken", () => {
  it("Returns the token endpoint's parsed JSON response as-is", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ access_token: "new-at", token_type: "Bearer" }),
      })
    )
    const result = await refreshAccessToken(CONFIG, { refreshToken: "rt" })
    expect(result).toEqual({ access_token: "new-at", token_type: "Bearer" })
  })
})
