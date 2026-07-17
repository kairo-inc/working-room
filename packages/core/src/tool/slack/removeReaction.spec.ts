import { describe, expect, it, vi } from "vitest"

import { ContextStore, IntegrationContext, SlackClient } from "@wr/integration"
import { DomainMessageContentToolCall } from "@wr/shared"

import { ToolSlackRemoveReaction } from "./removeReaction"

const buildToolCall = (input: unknown): DomainMessageContentToolCall => ({
  type: "tool-call",
  toolCallId: "call-1",
  toolName: "ToolSlackRemoveReaction",
  input,
})

const buildSlackClient = (overrides?: Partial<SlackClient>): SlackClient =>
  ({
    describeSelf: vi.fn(),
    listChannels: vi.fn(),
    listUsers: vi.fn(),
    getChannel: vi.fn().mockResolvedValue({ id: "C123", name: "general", isPrivate: false, isIm: false }),
    getUser: vi.fn(),
    sendMessage: vi.fn(),
    listMessages: vi.fn(),
    getMessage: vi.fn().mockResolvedValue({ ts: "1234.5678", text: "Hello team!", userId: "U123" }),
    addReaction: vi.fn(),
    removeReaction: vi.fn(),
    ...overrides,
  }) as SlackClient

const buildContext = (connected: boolean): IntegrationContext => ({
  slack: connected ? new ContextStore("oauth-client-id", "token") : undefined,
  serverConfig: { baseUrl: "https://app.example.com" },
})

describe("[Success] ToolSlackRemoveReaction", () => {
  it("Removes the reaction via SlackClient and returns a tool-result", async () => {
    const slackClient = buildSlackClient({
      removeReaction: vi.fn().mockResolvedValue(undefined),
    })
    const tool = new ToolSlackRemoveReaction(buildContext(true), slackClient)
    const toolCall = buildToolCall({ channelId: "C123", timestamp: "1234.5678", emojiName: "thumbsup" })

    const result = await tool.run({ toolCall } as never)

    expect(slackClient.removeReaction).toHaveBeenCalledWith({ channelId: "C123", timestamp: "1234.5678", emojiName: "thumbsup" })
    expect(result.message.content[0]).toMatchObject({
      type: "tool-result",
      toolCallId: "call-1",
      output: { type: "text", value: "Removed :thumbsup: reaction from the message." },
    })
  })

  it("Lists the tool only when a Slack integration is connected", () => {
    const connected = new ToolSlackRemoveReaction(buildContext(true), buildSlackClient())
    const disconnected = new ToolSlackRemoveReaction(buildContext(false), buildSlackClient())

    expect(connected.shouldBeListedInToolList()).toBe(true)
    expect(disconnected.shouldBeListedInToolList()).toBe(false)
  })

  it("Describes the change using the channel name and message text resolved via SlackClient", async () => {
    const slackClient = buildSlackClient({
      getChannel: vi.fn().mockResolvedValue({ id: "C123", name: "general", isPrivate: false, isIm: false }),
      getMessage: vi.fn().mockResolvedValue({ ts: "1234.5678", text: "Hello team!", userId: "U123" }),
    })
    const tool = new ToolSlackRemoveReaction(buildContext(true), slackClient)
    const toolCall = buildToolCall({ channelId: "C123", timestamp: "1234.5678", emojiName: "thumbsup" })

    const change = await tool.getChangeDescription(toolCall)

    expect(slackClient.getChannel).toHaveBeenCalledWith({ channelId: "C123" })
    expect(slackClient.getMessage).toHaveBeenCalledWith({ channelId: "C123", timestamp: "1234.5678" })
    expect(change).toEqual({ change: '-Channel: #general\n-Remove :thumbsup: from: "Hello team!"' })
  })

  it("Falls back to the raw timestamp in the change description when the message fails to resolve", async () => {
    const slackClient = buildSlackClient({
      getMessage: vi.fn().mockResolvedValue(null),
    })
    const tool = new ToolSlackRemoveReaction(buildContext(true), slackClient)
    const toolCall = buildToolCall({ channelId: "C123", timestamp: "1234.5678", emojiName: "thumbsup" })

    const change = await tool.getChangeDescription(toolCall)

    expect(change?.change).toContain("-Remove :thumbsup: from: message at 1234.5678")
  })
})

describe("[Failure] ToolSlackRemoveReaction", () => {
  it("Returns an error tool-result when input is invalid", async () => {
    const slackClient = buildSlackClient()
    const tool = new ToolSlackRemoveReaction(buildContext(true), slackClient)
    const toolCall = buildToolCall({ channelId: "C123" })

    const result = await tool.run({ toolCall } as never)

    expect(slackClient.removeReaction).not.toHaveBeenCalled()
    expect(result.message.content[0]).toMatchObject({ type: "tool-result", output: { type: "error-text" } })
  })

  it("Returns an error tool-result when SlackClient.removeReaction throws", async () => {
    const slackClient = buildSlackClient({
      removeReaction: vi.fn().mockRejectedValue(new Error("no_reaction")),
    })
    const tool = new ToolSlackRemoveReaction(buildContext(true), slackClient)
    const toolCall = buildToolCall({ channelId: "C123", timestamp: "1234.5678", emojiName: "thumbsup" })

    const result = await tool.run({ toolCall } as never)

    expect(result.message.content[0]).toMatchObject({ type: "tool-result", output: { type: "error-text" } })
  })
})
