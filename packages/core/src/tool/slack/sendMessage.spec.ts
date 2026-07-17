import { describe, expect, it, vi } from "vitest"

import { ContextStore, IntegrationContext, SlackClient } from "@wr/integration"
import { DomainMessageContentToolCall } from "@wr/shared"

import { ToolSlackSendMessage } from "./sendMessage"

const buildToolCall = (input: unknown): DomainMessageContentToolCall => ({
  type: "tool-call",
  toolCallId: "call-1",
  toolName: "ToolSlackSendMessage",
  input,
})

const buildSlackClient = (overrides?: Partial<SlackClient>): SlackClient =>
  ({
    describeTeam: vi.fn(),
    listChannels: vi.fn(),
    listUsers: vi.fn(),
    getChannel: vi.fn().mockResolvedValue({ id: "C123", name: "general", isPrivate: false, isIm: false }),
    getUser: vi.fn(),
    sendMessage: vi.fn(),
    listMessages: vi.fn(),
    getMessage: vi.fn(),
    addReaction: vi.fn(),
    removeReaction: vi.fn(),
    ...overrides,
  }) as SlackClient

const buildContext = (connected: boolean): IntegrationContext => ({
  slack: connected ? new ContextStore("oauth-client-id", "token") : undefined,
  serverConfig: { baseUrl: "https://app.example.com" },
})

describe("[Success] ToolSlackSendMessage", () => {
  it("Sends the message via SlackClient and returns a tool-result", async () => {
    const slackClient = buildSlackClient({
      sendMessage: vi.fn().mockResolvedValue({ channel: "C123", ts: "1234.5678" }),
    })
    const tool = new ToolSlackSendMessage(buildContext(true), slackClient)
    const toolCall = buildToolCall({ channelId: "C123", text: "Hello team!" })

    const result = await tool.run({ toolCall } as never)

    expect(slackClient.sendMessage).toHaveBeenCalledWith({ channelId: "C123", text: "Hello team!" })
    expect(result.message.content[0]).toMatchObject({
      type: "tool-result",
      toolCallId: "call-1",
      output: { type: "text" },
    })
  })

  it("Lists the tool only when a Slack integration is connected", () => {
    const connected = new ToolSlackSendMessage(buildContext(true), buildSlackClient())
    const disconnected = new ToolSlackSendMessage(buildContext(false), buildSlackClient())

    expect(connected.shouldBeListedInToolList()).toBe(true)
    expect(disconnected.shouldBeListedInToolList()).toBe(false)
  })

  it("Describes the change using the channel name resolved via SlackClient, not the raw channel ID", async () => {
    const slackClient = buildSlackClient({
      getChannel: vi.fn().mockResolvedValue({ id: "C123", name: "general", isPrivate: false, isIm: false }),
    })
    const tool = new ToolSlackSendMessage(buildContext(true), slackClient)
    const toolCall = buildToolCall({ channelId: "C123", text: "Hello team!" })

    const change = await tool.getChangeDescription(toolCall)

    expect(slackClient.getChannel).toHaveBeenCalledWith({ channelId: "C123" })
    expect(change).toEqual({ change: "+Channel: #general\n+Message: Hello team!" })
  })

  it("Sends a message to an existing DM conversation the same way as a channel, via channelId", async () => {
    const slackClient = buildSlackClient({
      sendMessage: vi.fn().mockResolvedValue({ channel: "D123", ts: "1234.5678" }),
    })
    const tool = new ToolSlackSendMessage(buildContext(true), slackClient)
    const toolCall = buildToolCall({ channelId: "D123", text: "Hi there!" })

    const result = await tool.run({ toolCall } as never)

    expect(slackClient.sendMessage).toHaveBeenCalledWith({ channelId: "D123", text: "Hi there!" })
    expect(result.message.content[0]).toMatchObject({
      type: "tool-result",
      toolCallId: "call-1",
      output: { type: "text" },
    })
  })

  it("Describes the change as a direct message when the resolved channel is a DM conversation", async () => {
    const slackClient = buildSlackClient({
      getChannel: vi.fn().mockResolvedValue({ id: "D123", name: "Jane Doe", isPrivate: true, isIm: true }),
    })
    const tool = new ToolSlackSendMessage(buildContext(true), slackClient)
    const toolCall = buildToolCall({ channelId: "D123", text: "Hi there!" })

    const change = await tool.getChangeDescription(toolCall)

    expect(slackClient.getChannel).toHaveBeenCalledWith({ channelId: "D123" })
    expect(change).toEqual({ change: "+Direct message to: Jane Doe\n+Message: Hi there!" })
  })
})

describe("[Failure] ToolSlackSendMessage", () => {
  it("Returns an error tool-result when input is invalid", async () => {
    const slackClient = buildSlackClient()
    const tool = new ToolSlackSendMessage(buildContext(true), slackClient)
    const toolCall = buildToolCall({ channelId: "C123" })

    const result = await tool.run({ toolCall } as never)

    expect(slackClient.sendMessage).not.toHaveBeenCalled()
    expect(result.message.content[0]).toMatchObject({ type: "tool-result", output: { type: "error-text" } })
  })

  it("Returns an error tool-result when channelId is not provided", async () => {
    const slackClient = buildSlackClient()
    const tool = new ToolSlackSendMessage(buildContext(true), slackClient)
    const toolCall = buildToolCall({ text: "Hello team!" })

    const result = await tool.run({ toolCall } as never)

    expect(slackClient.sendMessage).not.toHaveBeenCalled()
    expect(result.message.content[0]).toMatchObject({ type: "tool-result", output: { type: "error-text" } })
  })

  it("Returns an error tool-result when SlackClient.sendMessage throws", async () => {
    const slackClient = buildSlackClient({
      sendMessage: vi.fn().mockRejectedValue(new Error("channel_not_found")),
    })
    const tool = new ToolSlackSendMessage(buildContext(true), slackClient)
    const toolCall = buildToolCall({ channelId: "C123", text: "Hello team!" })

    const result = await tool.run({ toolCall } as never)

    expect(result.message.content[0]).toMatchObject({ type: "tool-result", output: { type: "error-text" } })
  })

  it("Propagates the error when SlackClient.getChannel fails to resolve the channel", async () => {
    const slackClient = buildSlackClient({
      getChannel: vi.fn().mockRejectedValue(new Error("channel_not_found")),
    })
    const tool = new ToolSlackSendMessage(buildContext(true), slackClient)
    const toolCall = buildToolCall({ channelId: "C123", text: "Hello team!" })

    await expect(tool.getChangeDescription(toolCall)).rejects.toThrow("channel_not_found")
  })
})
