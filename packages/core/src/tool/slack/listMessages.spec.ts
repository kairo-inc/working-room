import { describe, expect, it, vi } from "vitest"

import { ContextStore, IntegrationContext, SlackClient } from "@wr/integration"
import { DomainMessageContentToolCall } from "@wr/shared"

import { ToolSlackListMessages } from "./listMessages"

const buildToolCall = (input: unknown): DomainMessageContentToolCall => ({
  type: "tool-call",
  toolCallId: "call-1",
  toolName: "ToolSlackListMessages",
  input,
})

const buildSlackClient = (overrides?: Partial<SlackClient>): SlackClient =>
  ({
    describeTeam: vi.fn(),
    describeSelf: vi.fn(),
    listChannels: vi.fn(),
    listUsers: vi.fn(),
    getChannel: vi.fn(),
    getUser: vi.fn(),
    sendMessage: vi.fn(),
    listMessages: vi.fn().mockResolvedValue({ data: [], nextCursor: null }),
    getMessage: vi.fn(),
    addReaction: vi.fn(),
    removeReaction: vi.fn(),
    ...overrides,
  }) as SlackClient

const buildContext = (connected: boolean): IntegrationContext => ({
  slack: connected ? new ContextStore("oauth-client-id", "token") : undefined,
  serverConfig: { baseUrl: "https://app.example.com" },
})

describe("[Success] ToolSlackListMessages", () => {
  it("Lists messages via SlackClient, resolving each sender's name", async () => {
    const slackClient = buildSlackClient({
      listMessages: vi.fn().mockResolvedValue({
        data: [
          { ts: "1234.2", text: "See you there!", userId: "U123" },
          { ts: "1234.1", text: "Meeting at 3pm", userId: "U123" },
        ],
        nextCursor: null,
      }),
      getUser: vi.fn().mockResolvedValue({ id: "U123", name: "Jane Doe" }),
    })
    const tool = new ToolSlackListMessages(buildContext(true), slackClient)
    const toolCall = buildToolCall({ channelId: "C123" })

    const result = await tool.run({ toolCall } as never)

    expect(slackClient.listMessages).toHaveBeenCalledWith({ channelId: "C123", take: 50, cursor: undefined })
    // The sender is only looked up once even though they sent both messages.
    expect(slackClient.getUser).toHaveBeenCalledTimes(1)
    expect(slackClient.getUser).toHaveBeenCalledWith({ userId: "U123" })
    const value = (result.message.content[0] as { output: { value: string } }).output.value
    expect(value).toContain("- [1234.2] Jane Doe: See you there!")
    expect(value).toContain("- [1234.1] Jane Doe: Meeting at 3pm")
  })

  it("Falls back to the raw user ID when the sender fails to resolve, and to 'Unknown sender' when there is none", async () => {
    const slackClient = buildSlackClient({
      listMessages: vi.fn().mockResolvedValue({
        data: [
          { ts: "1234.2", text: "Hi!", userId: "U404" },
          { ts: "1234.1", text: "Channel created.", userId: null },
        ],
        nextCursor: null,
      }),
      getUser: vi.fn().mockRejectedValue(new Error("user_not_found")),
    })
    const tool = new ToolSlackListMessages(buildContext(true), slackClient)
    const toolCall = buildToolCall({ channelId: "C123" })

    const result = await tool.run({ toolCall } as never)

    const value = (result.message.content[0] as { output: { value: string } }).output.value
    expect(value).toContain("- [1234.2] U404: Hi!")
    expect(value).toContain("- [1234.1] Unknown sender: Channel created.")
  })

  it("Includes the next cursor in the result when more messages are available", async () => {
    const slackClient = buildSlackClient({
      listMessages: vi.fn().mockResolvedValue({ data: [], nextCursor: "cursor-2" }),
    })
    const tool = new ToolSlackListMessages(buildContext(true), slackClient)
    const toolCall = buildToolCall({ channelId: "C123" })

    const result = await tool.run({ toolCall } as never)

    const value = (result.message.content[0] as { output: { value: string } }).output.value
    expect(value).toContain("Next cursor: cursor-2")
  })

  it("Lists the tool only when a Slack integration is connected", () => {
    const connected = new ToolSlackListMessages(buildContext(true), buildSlackClient())
    const disconnected = new ToolSlackListMessages(buildContext(false), buildSlackClient())

    expect(connected.shouldBeListedInToolList()).toBe(true)
    expect(disconnected.shouldBeListedInToolList()).toBe(false)
  })
})

describe("[Failure] ToolSlackListMessages", () => {
  it("Returns an error tool-result when channelId is not provided", async () => {
    const slackClient = buildSlackClient()
    const tool = new ToolSlackListMessages(buildContext(true), slackClient)
    const toolCall = buildToolCall({})

    const result = await tool.run({ toolCall } as never)

    expect(slackClient.listMessages).not.toHaveBeenCalled()
    expect(result.message.content[0]).toMatchObject({ type: "tool-result", output: { type: "error-text" } })
  })

  it("Returns an error tool-result when SlackClient.listMessages throws", async () => {
    const slackClient = buildSlackClient({
      listMessages: vi.fn().mockRejectedValue(new Error("channel_not_found")),
    })
    const tool = new ToolSlackListMessages(buildContext(true), slackClient)
    const toolCall = buildToolCall({ channelId: "C123" })

    const result = await tool.run({ toolCall } as never)

    expect(result.message.content[0]).toMatchObject({ type: "tool-result", output: { type: "error-text" } })
  })
})
