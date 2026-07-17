import { describe, expect, it, vi } from "vitest"

import { ContextStore, IntegrationContext, SlackClient } from "@wr/integration"
import { DomainMessageContentToolCall } from "@wr/shared"

import { ToolSlackListChannels } from "./listChannels"

const buildToolCall = (input: unknown): DomainMessageContentToolCall => ({
  type: "tool-call",
  toolCallId: "call-1",
  toolName: "ToolSlackListChannels",
  input,
})

const buildSlackClient = (overrides?: Partial<SlackClient>): SlackClient =>
  ({
    listChannels: vi.fn().mockResolvedValue({ data: [], nextCursor: null }),
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

describe("[Success] ToolSlackListChannels", () => {
  it("Formats channels and DM conversations differently in the result text", async () => {
    const slackClient = buildSlackClient({
      listChannels: vi.fn().mockResolvedValue({
        data: [
          { id: "C123", name: "general", isPrivate: false, isIm: false },
          { id: "D123", name: "Jane Doe", isPrivate: true, isIm: true },
        ],
        nextCursor: null,
      }),
    })
    const tool = new ToolSlackListChannels(buildContext(true), slackClient)
    const toolCall = buildToolCall({})

    const result = await tool.run({ toolCall } as never)

    expect(result.message.content[0]).toMatchObject({
      type: "tool-result",
      output: {
        type: "text",
        value: expect.stringContaining("- general (ID: C123), isPrivate: false"),
      },
    })
    expect((result.message.content[0] as { output: { value: string } }).output.value).toContain("- Direct message with Jane Doe (ID: D123)")
  })

  it("Lists the tool only when a Slack integration is connected", () => {
    const connected = new ToolSlackListChannels(buildContext(true), buildSlackClient())
    const disconnected = new ToolSlackListChannels(buildContext(false), buildSlackClient())

    expect(connected.shouldBeListedInToolList()).toBe(true)
    expect(disconnected.shouldBeListedInToolList()).toBe(false)
  })
})

describe("[Failure] ToolSlackListChannels", () => {
  it("Returns an error tool-result when SlackClient.listChannels throws", async () => {
    const slackClient = buildSlackClient({
      listChannels: vi.fn().mockRejectedValue(new Error("rate_limited")),
    })
    const tool = new ToolSlackListChannels(buildContext(true), slackClient)
    const toolCall = buildToolCall({})

    const result = await tool.run({ toolCall } as never)

    expect(result.message.content[0]).toMatchObject({ type: "tool-result", output: { type: "error-text" } })
  })
})
