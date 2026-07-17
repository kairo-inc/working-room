import { describe, expect, it, vi } from "vitest"

import { ContextStore, IntegrationContext, SlackClient } from "@wr/integration"
import { DomainMessageContentToolCall } from "@wr/shared"

import { ToolSlackAddReaction } from "./addReaction"

const buildToolCall = (input: unknown): DomainMessageContentToolCall => ({
  type: "tool-call",
  toolCallId: "call-1",
  toolName: "ToolSlackAddReaction",
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

describe("[Success] ToolSlackAddReaction", () => {
  it("Adds the reaction via SlackClient and returns a tool-result", async () => {
    const slackClient = buildSlackClient({
      addReaction: vi.fn().mockResolvedValue(undefined),
    })
    const tool = new ToolSlackAddReaction(buildContext(true), slackClient)
    const toolCall = buildToolCall({ channelId: "C123", timestamp: "1234.5678", emojiName: "thumbsup" })

    const result = await tool.run({ toolCall } as never)

    expect(slackClient.addReaction).toHaveBeenCalledWith({ channelId: "C123", timestamp: "1234.5678", emojiName: "thumbsup" })
    expect(result.message.content[0]).toMatchObject({
      type: "tool-result",
      toolCallId: "call-1",
      output: { type: "text", value: "Added :thumbsup: reaction to the message." },
    })
  })

  it("Lists the tool only when a Slack integration is connected", () => {
    const connected = new ToolSlackAddReaction(buildContext(true), buildSlackClient())
    const disconnected = new ToolSlackAddReaction(buildContext(false), buildSlackClient())

    expect(connected.shouldBeListedInToolList()).toBe(true)
    expect(disconnected.shouldBeListedInToolList()).toBe(false)
  })

  it("Describes the change using the channel name and message text resolved via SlackClient", async () => {
    const slackClient = buildSlackClient({
      getChannel: vi.fn().mockResolvedValue({ id: "C123", name: "general", isPrivate: false, isIm: false }),
      getMessage: vi.fn().mockResolvedValue({ ts: "1234.5678", text: "Hello team!", userId: "U123" }),
    })
    const tool = new ToolSlackAddReaction(buildContext(true), slackClient)
    const toolCall = buildToolCall({ channelId: "C123", timestamp: "1234.5678", emojiName: "thumbsup" })

    const change = await tool.getChangeDescription(toolCall)

    expect(slackClient.getChannel).toHaveBeenCalledWith({ channelId: "C123" })
    expect(slackClient.getMessage).toHaveBeenCalledWith({ channelId: "C123", timestamp: "1234.5678" })
    expect(change).toEqual({ change: '+Channel: #general\n+React :thumbsup: to: "Hello team!"' })
  })

  it("Describes the change as a direct message when the resolved channel is a DM conversation", async () => {
    const slackClient = buildSlackClient({
      getChannel: vi.fn().mockResolvedValue({ id: "D123", name: "Jane Doe", isPrivate: true, isIm: true }),
    })
    const tool = new ToolSlackAddReaction(buildContext(true), slackClient)
    const toolCall = buildToolCall({ channelId: "D123", timestamp: "1234.5678", emojiName: "thumbsup" })

    const change = await tool.getChangeDescription(toolCall)

    expect(change?.change).toContain("+Direct message with: Jane Doe")
  })

  it("Falls back to the raw timestamp in the change description when the message fails to resolve", async () => {
    const slackClient = buildSlackClient({
      getMessage: vi.fn().mockResolvedValue(null),
    })
    const tool = new ToolSlackAddReaction(buildContext(true), slackClient)
    const toolCall = buildToolCall({ channelId: "C123", timestamp: "1234.5678", emojiName: "thumbsup" })

    const change = await tool.getChangeDescription(toolCall)

    expect(change?.change).toContain("+React :thumbsup: to: message at 1234.5678")
  })
})

describe("[Failure] ToolSlackAddReaction", () => {
  it("Returns an error tool-result when input is invalid", async () => {
    const slackClient = buildSlackClient()
    const tool = new ToolSlackAddReaction(buildContext(true), slackClient)
    const toolCall = buildToolCall({ channelId: "C123" })

    const result = await tool.run({ toolCall } as never)

    expect(slackClient.addReaction).not.toHaveBeenCalled()
    expect(result.message.content[0]).toMatchObject({ type: "tool-result", output: { type: "error-text" } })
  })

  it("Returns an error tool-result when SlackClient.addReaction throws", async () => {
    const slackClient = buildSlackClient({
      addReaction: vi.fn().mockRejectedValue(new Error("already_reacted")),
    })
    const tool = new ToolSlackAddReaction(buildContext(true), slackClient)
    const toolCall = buildToolCall({ channelId: "C123", timestamp: "1234.5678", emojiName: "thumbsup" })

    const result = await tool.run({ toolCall } as never)

    expect(result.message.content[0]).toMatchObject({ type: "tool-result", output: { type: "error-text" } })
  })
})
