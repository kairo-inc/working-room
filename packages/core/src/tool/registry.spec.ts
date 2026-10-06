import { describe, expect, it, vi } from "vitest"

import { McpClient } from "@wr/integration"
import { AiVendorConfigs } from "@wr/shared"

import { Tool } from "./base"
import { ToolMcp } from "./mcp/tool"
import { ToolRegistry } from "./registry"

const mcpClient = { listTools: vi.fn(), callTool: vi.fn() } as McpClient
const buildMcpTool = (serverName: string, toolName: string) =>
  new ToolMcp(
    { name: serverName, url: "https://example.com/mcp", accessToken: null },
    { name: toolName, inputSchema: { type: "object" } },
    mcpClient
  )

describe("[Success] ToolRegistry", () => {
  it("Registers MCP Tools without replacing an existing Tool of the same name", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {})
    const existing = buildMcpTool("github", "create_issue") as Tool
    const sameName = buildMcpTool("github", "create_issue")
    const other = buildMcpTool("github", "list_issues")

    const registry = new ToolRegistry({} as AiVendorConfigs, [existing], [], [sameName, other])

    expect(registry.get("mcp__github__create_issue")).toBe(existing)
    expect(registry.get("mcp__github__list_issues")).toBe(other)
    expect(warn).toHaveBeenCalledOnce()
    warn.mockRestore()
  })
})
