import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { OAuthTokenExchangeError } from "@wr/shared"

import { exchangeSlackCode, getSlackOAuthConfig } from "./slack"

beforeEach(() => {
  vi.stubEnv("SLACK_CLIENT_ID", "test-client-id")
  vi.stubEnv("SLACK_CLIENT_SECRET", "test-client-secret")
})

afterEach(() => {
  vi.unstubAllGlobals()
  vi.unstubAllEnvs()
})

describe("[Success] getSlackOAuthConfig", () => {
  it("Requests no bot scopes and joins user_scope with commas", () => {
    const config = getSlackOAuthConfig("https://app.example.com/api/oauth/slack/callback")
    expect(config.scopes).toEqual([])
    expect(config.extraParams?.user_scope).toBe("channels:read,groups:read")
    expect(config.scopeSeparator).toBe(",")
  })
})

describe("[Success] exchangeSlackCode", () => {
  it("Maps a successful token response, including team.id/team.name", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          ok: true,
          access_token: "xoxp-user-token",
          scope: "identity.basic,identity.email,identity.team",
          token_type: "user",
          team: { id: "T123", name: "Test Team" },
        }),
      })
    )
    const result = await exchangeSlackCode("https://app.example.com/api/oauth/slack/callback", {
      code: "auth-code",
      codeVerifier: "verifier",
    })
    expect(result).toEqual({
      accessToken: "xoxp-user-token",
      refreshToken: undefined,
      expiresIn: undefined,
      scope: "identity.basic,identity.email,identity.team",
      tokenType: "user",
      teamId: "T123",
      teamName: "Test Team",
    })
  })

  it("Sends client_secret but not code_verifier in the token exchange request body", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ ok: true, access_token: "xoxb-bot-token", token_type: "bot", team: { id: "T123", name: "Test Team" } }),
    })
    vi.stubGlobal("fetch", fetchMock)
    await exchangeSlackCode("https://app.example.com/api/oauth/slack/callback", { code: "auth-code", codeVerifier: "verifier" })
    const body = fetchMock.mock.calls[0]![1].body as URLSearchParams
    expect(body.get("client_secret")).toBe("test-client-secret")
    expect(body.has("code_verifier")).toBe(false)
  })
})

describe("[Failure] exchangeSlackCode", () => {
  it("Throws when access_token is not present in the response", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ ok: true, team: { id: "T123", name: "Test Team" } }),
      })
    )
    await expect(
      exchangeSlackCode("https://app.example.com/api/oauth/slack/callback", { code: "auth-code", codeVerifier: "verifier" })
    ).rejects.toThrow()
  })

  it("Throws OAuthTokenExchangeError when team information is missing", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ ok: true, access_token: "xoxp-user-token", token_type: "user" }),
      })
    )
    await expect(
      exchangeSlackCode("https://app.example.com/api/oauth/slack/callback", { code: "auth-code", codeVerifier: "verifier" })
    ).rejects.toThrow(OAuthTokenExchangeError)
  })
})
