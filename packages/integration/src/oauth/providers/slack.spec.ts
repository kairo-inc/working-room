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
    expect(config.extraParams?.user_scope).toBe("channels:read,groups:read,chat:write,users:read,im:read,mpim:read")
    expect(config.scopeSeparator).toBe(",")
  })
})

describe("[Success] exchangeSlackCode", () => {
  it("Maps a successful token response, including team.id/team.name and authed_user.id", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          ok: true,
          team: { id: "T123", name: "Test Team" },
          authed_user: {
            id: "U123",
            scope: "channels:read,groups:read",
            access_token: "xoxp-user-token",
            token_type: "user",
            refresh_token: "xoxe-refresh-token",
            expires_in: 43200,
          },
        }),
      })
    )
    const result = await exchangeSlackCode("https://app.example.com/api/oauth/slack/callback", {
      code: "auth-code",
      codeVerifier: "verifier",
    })
    expect(result).toEqual({
      accessToken: "xoxp-user-token",
      refreshToken: "xoxe-refresh-token",
      expiresIn: 43200,
      scope: "channels:read,groups:read",
      tokenType: "user",
      teamId: "T123",
      teamName: "Test Team",
      id: "U123",
    })
  })

  it("Sends client_secret but not code_verifier in the token exchange request body", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        ok: true,
        team: { id: "T123", name: "Test Team" },
        authed_user: {
          id: "U123",
          access_token: "xoxp-user-token",
          token_type: "user",
          refresh_token: "xoxe-refresh-token",
          scope: "channels:read,groups:read",
        },
      }),
    })
    vi.stubGlobal("fetch", fetchMock)
    await exchangeSlackCode("https://app.example.com/api/oauth/slack/callback", { code: "auth-code", codeVerifier: "verifier" })
    const body = fetchMock.mock.calls[0]![1].body as URLSearchParams
    expect(body.get("client_secret")).toBe("test-client-secret")
    expect(body.has("code_verifier")).toBe(false)
  })
})

describe("[Failure] exchangeSlackCode", () => {
  it("Throws OAuthTokenExchangeError when authed_user.access_token is not present", async () => {
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
    ).rejects.toThrow(OAuthTokenExchangeError)
  })

  it("Throws OAuthTokenExchangeError when refresh_token or scope is missing", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          ok: true,
          team: { id: "T123", name: "Test Team" },
          authed_user: { id: "U123", access_token: "xoxp-user-token", token_type: "user" },
        }),
      })
    )
    await expect(
      exchangeSlackCode("https://app.example.com/api/oauth/slack/callback", { code: "auth-code", codeVerifier: "verifier" })
    ).rejects.toThrow(OAuthTokenExchangeError)
  })

  it("Throws OAuthTokenExchangeError when team information is missing", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          ok: true,
          authed_user: {
            id: "U123",
            access_token: "xoxp-user-token",
            token_type: "user",
            refresh_token: "xoxe-refresh-token",
            scope: "channels:read,groups:read",
          },
        }),
      })
    )
    await expect(
      exchangeSlackCode("https://app.example.com/api/oauth/slack/callback", { code: "auth-code", codeVerifier: "verifier" })
    ).rejects.toThrow(OAuthTokenExchangeError)
  })
})
