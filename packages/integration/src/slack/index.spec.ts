import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { NoContextError, SlackApiErrorNotFound } from "@wr/shared"

import { OauthService } from "../oauth/serviceType"
import { ContextStore } from "../oauth/store"
import { IntegrationContext } from "../types"
import { SlackClientImpl } from "./index"

const postMessageMock = vi.fn()
const conversationsInfoMock = vi.fn()
const conversationsListMock = vi.fn()
const conversationsMembersMock = vi.fn()
const usersInfoMock = vi.fn()
const usersListMock = vi.fn()
const authTestMock = vi.fn()

vi.mock("@slack/web-api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@slack/web-api")>()
  return {
    ...actual,
    WebClient: vi.fn().mockImplementation(function MockWebClient(this: {
      chat: { postMessage: typeof postMessageMock }
      conversations: { info: typeof conversationsInfoMock; list: typeof conversationsListMock; members: typeof conversationsMembersMock }
      users: { info: typeof usersInfoMock; list: typeof usersListMock }
      auth: { test: typeof authTestMock }
    }) {
      this.chat = { postMessage: postMessageMock }
      this.conversations = { info: conversationsInfoMock, list: conversationsListMock, members: conversationsMembersMock }
      this.users = { info: usersInfoMock, list: usersListMock }
      this.auth = { test: authTestMock }
    }),
  }
})

const buildOauthService = (): OauthService => ({
  handleOauthCallback: vi.fn(),
  refreshToken: vi.fn(),
})

const buildContext = (): IntegrationContext => ({
  slack: new ContextStore("oauth-client-id", "initial-token"),
  serverConfig: { baseUrl: "https://app.example.com" },
})

beforeEach(() => {
  postMessageMock.mockReset()
  conversationsInfoMock.mockReset()
  conversationsListMock.mockReset()
  conversationsMembersMock.mockReset()
  usersInfoMock.mockReset()
  usersListMock.mockReset()
  authTestMock.mockReset()
})

afterEach(() => {
  vi.clearAllMocks()
})

describe("[Success] SlackClientImpl.sendMessage", () => {
  it("Sends a message and returns the channel and ts from the response", async () => {
    postMessageMock.mockResolvedValue({ ok: true, channel: "C123", ts: "1234.5678" })
    // Use the actual SlackClientImpl class. sendMessage is mocked by the postMessageMock above, so we can test the behavior of sendMessage without making real API calls.
    const client = new SlackClientImpl(buildOauthService(), buildContext())

    const result = await client.sendMessage({ channelId: "C123", text: "Hello team!" })

    expect(result).toEqual({ channel: "C123", ts: "1234.5678" })
    expect(postMessageMock).toHaveBeenCalledWith({ channel: "C123", text: "Hello team!" })
  })
})

describe("[Success] SlackClientImpl.describeSelf", () => {
  it("Identifies the connected user via auth.test, then resolves their display name via getUser", async () => {
    authTestMock.mockResolvedValue({ ok: true, user_id: "U123", user: "jane" })
    usersInfoMock.mockResolvedValue({ ok: true, user: { id: "U123", name: "jane", real_name: "Jane Doe" } })
    const client = new SlackClientImpl(buildOauthService(), buildContext())

    const result = await client.describeSelf()

    expect(authTestMock).toHaveBeenCalledWith({})
    expect(usersInfoMock).toHaveBeenCalledWith({ user: "U123" })
    expect(result).toEqual({ id: "U123", name: "Jane Doe" })
  })
})

describe("[Failure] SlackClientImpl.describeSelf", () => {
  it("Throws SlackApiErrorNotFound when the response is not ok", async () => {
    authTestMock.mockResolvedValue({ ok: false })
    const client = new SlackClientImpl(buildOauthService(), buildContext())

    await expect(client.describeSelf()).rejects.toThrow(SlackApiErrorNotFound)
  })
})

describe("[Success] SlackClientImpl.listChannels", () => {
  it("Requests channels and DM conversations together, resolving DM names via SlackClient.getUser", async () => {
    conversationsListMock.mockResolvedValue({
      ok: true,
      channels: [
        { id: "C123", name: "general", is_private: false },
        { id: "D123", is_im: true, user: "U123" },
      ],
      response_metadata: { next_cursor: "next-page" },
    })
    usersInfoMock.mockResolvedValue({ ok: true, user: { id: "U123", name: "jane", real_name: "Jane Doe" } })
    const client = new SlackClientImpl(buildOauthService(), buildContext())

    const result = await client.listChannels({ take: 50 })

    expect(conversationsListMock).toHaveBeenCalledWith({ limit: 50, cursor: undefined, types: "public_channel,private_channel,im,mpim" })
    expect(result).toEqual({
      data: [
        { id: "C123", name: "general", isPrivate: false, isIm: false },
        { id: "D123", name: "Jane Doe", isPrivate: true, isIm: true },
      ],
      nextCursor: "next-page",
    })
  })

  it("Resolves a group DM's name to its participants' display names, joined by comma", async () => {
    conversationsListMock.mockResolvedValue({
      ok: true,
      channels: [{ id: "G123", is_mpim: true, name: "mpdm-jane--john-1" }],
      response_metadata: {},
    })
    conversationsMembersMock.mockResolvedValue({ ok: true, members: ["U123", "U456"] })
    usersInfoMock.mockImplementation(({ user }: { user: string }) =>
      Promise.resolve(
        user === "U123"
          ? { ok: true, user: { id: "U123", real_name: "Jane Doe" } }
          : { ok: true, user: { id: "U456", real_name: "John Smith" } }
      )
    )
    const client = new SlackClientImpl(buildOauthService(), buildContext())

    const result = await client.listChannels({ take: 50 })

    expect(conversationsMembersMock).toHaveBeenCalledWith({ channel: "G123" })
    expect(result.data).toEqual([{ id: "G123", name: "Jane Doe, John Smith", isPrivate: true, isIm: true }])
  })

  it("Falls back to the raw member ID when a group DM participant's name cannot be resolved", async () => {
    conversationsListMock.mockResolvedValue({
      ok: true,
      channels: [{ id: "G123", is_mpim: true, name: "mpdm-jane--john-1" }],
      response_metadata: {},
    })
    conversationsMembersMock.mockResolvedValue({ ok: true, members: ["U123"] })
    usersInfoMock.mockResolvedValue({ ok: false })
    const client = new SlackClientImpl(buildOauthService(), buildContext())

    const result = await client.listChannels({ take: 50 })

    expect(result.data).toEqual([{ id: "G123", name: "U123", isPrivate: true, isIm: true }])
  })

  it("Falls back to the raw channel name when the group DM's member list cannot be fetched", async () => {
    conversationsListMock.mockResolvedValue({
      ok: true,
      channels: [{ id: "G123", is_mpim: true, name: "mpdm-jane--john-1" }],
      response_metadata: {},
    })
    conversationsMembersMock.mockResolvedValue({ ok: false })
    const client = new SlackClientImpl(buildOauthService(), buildContext())

    const result = await client.listChannels({ take: 50 })

    expect(result.data).toEqual([{ id: "G123", name: "mpdm-jane--john-1", isPrivate: true, isIm: true }])
  })
})

describe("[Failure] SlackClientImpl.listChannels", () => {
  it("Throws SlackApiErrorNotFound when the response is not ok", async () => {
    conversationsListMock.mockResolvedValue({ ok: false })
    const client = new SlackClientImpl(buildOauthService(), buildContext())

    await expect(client.listChannels({ take: 50 })).rejects.toThrow(SlackApiErrorNotFound)
  })
})

describe("[Success] SlackClientImpl.getChannel", () => {
  it("Returns the channel resolved from conversations.info", async () => {
    conversationsInfoMock.mockResolvedValue({ ok: true, channel: { id: "C123", name: "general", is_private: false } })
    const client = new SlackClientImpl(buildOauthService(), buildContext())

    const result = await client.getChannel({ channelId: "C123" })

    expect(result).toEqual({ id: "C123", name: "general", isPrivate: false, isIm: false })
    expect(conversationsInfoMock).toHaveBeenCalledWith({ channel: "C123" })
  })

  it("Resolves a DM conversation's name to the other User's display name", async () => {
    conversationsInfoMock.mockResolvedValue({ ok: true, channel: { id: "D123", is_im: true, user: "U123" } })
    usersInfoMock.mockResolvedValue({ ok: true, user: { id: "U123", name: "jane", real_name: "Jane Doe" } })
    const client = new SlackClientImpl(buildOauthService(), buildContext())

    const result = await client.getChannel({ channelId: "D123" })

    expect(result).toEqual({ id: "D123", name: "Jane Doe", isPrivate: true, isIm: true })
  })

  it("Falls back to the raw user ID when the DM partner's name cannot be resolved", async () => {
    conversationsInfoMock.mockResolvedValue({ ok: true, channel: { id: "D123", is_im: true, user: "U123" } })
    usersInfoMock.mockResolvedValue({ ok: false })
    const client = new SlackClientImpl(buildOauthService(), buildContext())

    const result = await client.getChannel({ channelId: "D123" })

    expect(result).toEqual({ id: "D123", name: "U123", isPrivate: true, isIm: true })
  })
})

describe("[Failure] SlackClientImpl.getChannel", () => {
  it("Throws SlackApiErrorNotFound when the response is not ok", async () => {
    conversationsInfoMock.mockResolvedValue({ ok: false })
    const client = new SlackClientImpl(buildOauthService(), buildContext())

    await expect(client.getChannel({ channelId: "C123" })).rejects.toThrow(SlackApiErrorNotFound)
  })
})

describe("[Success] SlackClientImpl.getUser", () => {
  it("Returns the user resolved from users.info, preferring real_name over name", async () => {
    usersInfoMock.mockResolvedValue({ ok: true, user: { id: "U123", name: "jane", real_name: "Jane Doe" } })
    const client = new SlackClientImpl(buildOauthService(), buildContext())

    const result = await client.getUser({ userId: "U123" })

    expect(result).toEqual({ id: "U123", name: "Jane Doe" })
    expect(usersInfoMock).toHaveBeenCalledWith({ user: "U123" })
  })

  it("Falls back to name when real_name is not present", async () => {
    usersInfoMock.mockResolvedValue({ ok: true, user: { id: "U123", name: "jane" } })
    const client = new SlackClientImpl(buildOauthService(), buildContext())

    const result = await client.getUser({ userId: "U123" })

    expect(result).toEqual({ id: "U123", name: "jane" })
  })
})

describe("[Success] SlackClientImpl.listUsers", () => {
  it("Returns users, excluding bots, deleted accounts, and Slackbot", async () => {
    usersListMock.mockResolvedValue({
      ok: true,
      members: [
        { id: "U123", name: "jane", real_name: "Jane Doe" },
        { id: "B123", name: "some-bot", is_bot: true },
        { id: "U456", name: "deactivated", deleted: true },
        { id: "USLACKBOT", name: "slackbot" },
      ],
      response_metadata: { next_cursor: "next-page" },
    })
    const client = new SlackClientImpl(buildOauthService(), buildContext())

    const result = await client.listUsers({ take: 50 })

    expect(result).toEqual({ data: [{ id: "U123", name: "Jane Doe" }], nextCursor: "next-page" })
    expect(usersListMock).toHaveBeenCalledWith({ limit: 50, cursor: undefined })
  })
})

describe("[Failure] SlackClientImpl.listUsers", () => {
  it("Throws SlackApiErrorNotFound when the response is not ok", async () => {
    usersListMock.mockResolvedValue({ ok: false })
    const client = new SlackClientImpl(buildOauthService(), buildContext())

    await expect(client.listUsers({ take: 50 })).rejects.toThrow(SlackApiErrorNotFound)
  })
})

describe("[Failure] SlackClientImpl.getUser", () => {
  it("Throws SlackApiErrorNotFound when the response is not ok", async () => {
    usersInfoMock.mockResolvedValue({ ok: false })
    const client = new SlackClientImpl(buildOauthService(), buildContext())

    await expect(client.getUser({ userId: "U123" })).rejects.toThrow(SlackApiErrorNotFound)
  })
})

describe("[Failure] SlackClientImpl.sendMessage", () => {
  it("Throws SlackApiErrorNotFound when the response is not ok", async () => {
    postMessageMock.mockResolvedValue({ ok: false })
    const client = new SlackClientImpl(buildOauthService(), buildContext())

    await expect(client.sendMessage({ channelId: "C123", text: "Hello team!" })).rejects.toThrow(SlackApiErrorNotFound)
  })

  it("Throws NoContextError when no Slack integration context is set", async () => {
    const client = new SlackClientImpl(buildOauthService(), { serverConfig: { baseUrl: "https://app.example.com" } })

    await expect(client.sendMessage({ channelId: "C123", text: "Hello team!" })).rejects.toThrow(NoContextError)
  })
})
