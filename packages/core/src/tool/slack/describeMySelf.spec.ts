import { describe, expect, it, vi } from "vitest"

import { ContextStore, IntegrationContext, SlackClient } from "@wr/integration"
import { DomainMessageContentToolCall } from "@wr/shared"

import { ToolSlackDescribeMySelf } from "./describeMySelf"

const buildToolCall = (input: unknown): DomainMessageContentToolCall => ({
  type: "tool-call",
  toolCallId: "call-1",
  toolName: "ToolSlackDescribeMySelf",
  input,
})

const buildSlackClient = (overrides?: Partial<SlackClient>): SlackClient =>
  ({
    describeTeam: vi.fn(),
    describeSelf: vi.fn().mockResolvedValue({ id: "U123", name: "Jane Doe" }),
    listChannels: vi.fn(),
    listUsers: vi.fn(),
    getChannel: vi.fn(),
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

describe("[Success] ToolSlackDescribeMySelf", () => {
  it("Returns a tool-result describing the connected user's own Slack identity", async () => {
    const slackClient = buildSlackClient({
      describeSelf: vi.fn().mockResolvedValue({ id: "U123", name: "Jane Doe" }),
    })
    const tool = new ToolSlackDescribeMySelf(buildContext(true), slackClient)
    const toolCall = buildToolCall({})

    const result = await tool.run({ toolCall } as never)

    expect(slackClient.describeSelf).toHaveBeenCalled()
    expect(result.message.content[0]).toMatchObject({
      type: "tool-result",
      toolCallId: "call-1",
      output: { type: "text", value: "You are Jane Doe (ID: U123)." },
    })
  })

  it("Lists the tool only when a Slack integration is connected", () => {
    const connected = new ToolSlackDescribeMySelf(buildContext(true), buildSlackClient())
    const disconnected = new ToolSlackDescribeMySelf(buildContext(false), buildSlackClient())

    expect(connected.shouldBeListedInToolList()).toBe(true)
    expect(disconnected.shouldBeListedInToolList()).toBe(false)
  })
})

describe("[Failure] ToolSlackDescribeMySelf", () => {
  it("Returns an error tool-result when SlackClient.describeSelf throws", async () => {
    const slackClient = buildSlackClient({
      describeSelf: vi.fn().mockRejectedValue(new Error("not_authed")),
    })
    const tool = new ToolSlackDescribeMySelf(buildContext(true), slackClient)
    const toolCall = buildToolCall({})

    const result = await tool.run({ toolCall } as never)

    expect(result.message.content[0]).toMatchObject({ type: "tool-result", output: { type: "error-text" } })
  })
})
