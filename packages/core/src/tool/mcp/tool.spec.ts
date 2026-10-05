import { describe, expect, it, vi } from "vitest"

import { McpClient, McpServerConnection } from "@wr/integration"
import { DomainMcpServerTool, DomainMessageContentToolCall } from "@wr/shared"

import { ToolMcp } from "./tool"

const server: McpServerConnection = {
  id: "server-1",
  name: "github",
  url: "https://example.com/mcp",
  accessToken: "token",
}

const definition: DomainMcpServerTool = {
  name: "create_issue",
  description: "Create a GitHub issue.",
  inputSchema: {
    type: "object",
    properties: {
      title: { type: "string" },
      body: { type: "string" },
    },
    required: ["title"],
  },
}

const buildToolCall = (input: unknown): DomainMessageContentToolCall => ({
  type: "tool-call",
  toolCallId: "call-1",
  toolName: "mcp__github__create_issue",
  input,
})

const buildMcpClient = (overrides?: Partial<McpClient>): McpClient =>
  ({
    listTools: vi.fn(),
    callTool: vi.fn(),
    ...overrides,
  }) as McpClient

describe("[Success] ToolMcp", () => {
  it("Builds its name, description, and input schema from the Tool definition", () => {
    const tool = new ToolMcp(server, definition, buildMcpClient())

    expect(tool.name).toBe("mcp__github__create_issue")
    expect(tool.description).toBe("[MCP server: github] Create a GitHub issue.")
    expect(tool.needApproval).toBe(true)
    expect(tool.inputSchema.safeParse({ title: "Bug" }).success).toBe(true)
    expect(tool.inputSchema.safeParse({ body: "No title" }).success).toBe(false)
  })

  it("Requires approval unless the MCP server reports the Tool as read-only", () => {
    const build = (annotations?: DomainMcpServerTool["annotations"]) =>
      new ToolMcp(server, { ...definition, annotations }, buildMcpClient())

    const readOnly = build({ readOnlyHint: true })
    expect(readOnly.needApproval).toBe(false)
    expect(readOnly.toolType).toBe("read")

    const destructive = build({ readOnlyHint: false, destructiveHint: true })
    expect(destructive.needApproval).toBe(true)
    expect(destructive.toolType).toBe("delete")

    const write = build({ readOnlyHint: false, destructiveHint: false })
    expect(write.needApproval).toBe(true)
    expect(write.toolType).toBe("edit")

    const noAnnotations = build(undefined)
    expect(noAnnotations.needApproval).toBe(true)
    expect(noAnnotations.toolType).toBe("edit")
  })

  it("Replaces characters that LLM APIs do not accept in Tool names and limits the length", () => {
    expect(ToolMcp.buildName("My Server", "search.files")).toBe("mcp__My_Server__search_files")
    expect(ToolMcp.buildName("s".repeat(100), "tool")).toHaveLength(64)
  })

  it("Calls the Tool by its own name on the MCP server and returns the text content", async () => {
    const mcpClient = buildMcpClient({
      callTool: vi.fn().mockResolvedValue({
        content: [
          { type: "text", text: "Created issue #1." },
          { type: "image", data: "base64", mimeType: "image/png" },
        ],
      }),
    })
    const tool = new ToolMcp(server, definition, mcpClient)

    const result = await tool.run({ toolCall: buildToolCall({ title: "Bug" }) } as never)

    expect(mcpClient.callTool).toHaveBeenCalledWith(server, { name: "create_issue", arguments: { title: "Bug" } })
    expect(result.message.content[0]).toMatchObject({
      type: "tool-result",
      toolCallId: "call-1",
      output: { type: "text", value: "Created issue #1.\n[image content omitted]" },
    })
  })

  it("Returns structured content as JSON text when there is no content", async () => {
    const mcpClient = buildMcpClient({
      callTool: vi.fn().mockResolvedValue({ content: [], structuredContent: { number: 1 } }),
    })
    const tool = new ToolMcp(server, definition, mcpClient)

    const result = await tool.run({ toolCall: buildToolCall({ title: "Bug" }) } as never)

    expect(result.message.content[0]).toMatchObject({ output: { type: "text", value: '{"number":1}' } })
  })

  it("Describes the change with the server name, Tool name, and input", async () => {
    const tool = new ToolMcp(server, definition, buildMcpClient())

    const change = await tool.getChangeDescription(buildToolCall({ title: "Bug" }))

    expect(change).toEqual({ change: '+MCP server: github\n+Tool: create_issue\n+Input: {\n  "title": "Bug"\n}' })
  })

  it("Accepts any object when the input schema can not be converted", () => {
    const tool = new ToolMcp(server, { name: "broken", inputSchema: { type: "not-a-type" } }, buildMcpClient())

    expect(tool.inputSchema.safeParse({ anything: 1 }).success).toBe(true)
  })
})

describe("[Failure] ToolMcp", () => {
  it("Returns an error when the MCP Tool reports an error", async () => {
    const mcpClient = buildMcpClient({
      callTool: vi.fn().mockResolvedValue({ content: [{ type: "text", text: "Repository not found." }], isError: true }),
    })
    const tool = new ToolMcp(server, definition, mcpClient)

    const result = await tool.run({ toolCall: buildToolCall({ title: "Bug" }) } as never)

    expect(result.message.content[0]).toMatchObject({ output: { type: "error-text", value: "Repository not found." } })
  })

  it("Returns an error when the MCP server can not be reached", async () => {
    const mcpClient = buildMcpClient({ callTool: vi.fn().mockRejectedValue(new Error("connect ECONNREFUSED")) })
    const tool = new ToolMcp(server, definition, mcpClient)

    const result = await tool.run({ toolCall: buildToolCall({ title: "Bug" }) } as never)

    expect(result.message.content[0]).toMatchObject({
      output: {
        type: "error-text",
        value: 'Failed to call the MCP Tool "create_issue" on "github": connect ECONNREFUSED',
      },
    })
  })

  it("Returns an error without calling the MCP server when the input is invalid", async () => {
    const mcpClient = buildMcpClient()
    const tool = new ToolMcp(server, definition, mcpClient)

    const result = await tool.run({ toolCall: buildToolCall({ body: "No title" }) } as never)

    expect(mcpClient.callTool).not.toHaveBeenCalled()
    expect(result.message.content[0]).toMatchObject({ output: { type: "error-text" } })
  })
})
