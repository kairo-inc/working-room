import { describe, expect, it, vi } from "vitest"

import { ContextStore, IntegrationContext, SlackClient } from "@wr/integration"
import { DomainMessageContentToolCall } from "@wr/shared"

import { ToolSlackListUsers } from "./listUsers"

const buildToolCall = (input: unknown): DomainMessageContentToolCall => ({
  type: "tool-call",
  toolCallId: "call-1",
  toolName: "ToolSlackListUsers",
  input,
})

const buildSlackClient = (overrides?: Partial<SlackClient>): SlackClient =>
  ({
    describeTeam: vi.fn(),
    listChannels: vi.fn(),
    listUsers: vi.fn().mockResolvedValue({ data: [{ id: "U123", name: "Jane Doe" }], nextCursor: null }),
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

describe("[Success] ToolSlackListUsers", () => {
  it("Lists users via SlackClient and returns a tool-result with their names and IDs", async () => {
    const slackClient = buildSlackClient({
      listUsers: vi.fn().mockResolvedValue({ data: [{ id: "U123", name: "Jane Doe" }], nextCursor: null }),
    })
    const tool = new ToolSlackListUsers(buildContext(true), slackClient)
    const toolCall = buildToolCall({})

    const result = await tool.run({ toolCall } as never)

    expect(slackClient.listUsers).toHaveBeenCalledWith({ take: 50, cursor: undefined })
    expect(result.message.content[0]).toMatchObject({
      type: "tool-result",
      toolCallId: "call-1",
      output: { type: "text", value: expect.stringContaining("Jane Doe (ID: U123)") },
    })
  })

  it("Lists the tool only when a Slack integration is connected", () => {
    const connected = new ToolSlackListUsers(buildContext(true), buildSlackClient())
    const disconnected = new ToolSlackListUsers(buildContext(false), buildSlackClient())

    expect(connected.shouldBeListedInToolList()).toBe(true)
    expect(disconnected.shouldBeListedInToolList()).toBe(false)
  })
})

describe("[Failure] ToolSlackListUsers", () => {
  it("Returns an error tool-result when SlackClient.listUsers throws", async () => {
    const slackClient = buildSlackClient({
      listUsers: vi.fn().mockRejectedValue(new Error("rate_limited")),
    })
    const tool = new ToolSlackListUsers(buildContext(true), slackClient)
    const toolCall = buildToolCall({})

    const result = await tool.run({ toolCall } as never)

    expect(result.message.content[0]).toMatchObject({ type: "tool-result", output: { type: "error-text" } })
  })
})
