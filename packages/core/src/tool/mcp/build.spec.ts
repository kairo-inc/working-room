import { describe, expect, it, vi } from "vitest"

import { McpClient } from "@wr/integration"
import { DomainMcpServer } from "@wr/shared"

import { buildMcpTools } from "./build"

const mcpClient = { listTools: vi.fn(), callTool: vi.fn() } as McpClient

const buildServer = (overrides: Partial<DomainMcpServer>): DomainMcpServer => ({
  id: "server-1",
  createdAt: new Date(),
  updatedAt: new Date(),
  name: "github",
  url: "https://example.com/mcp",
  accessToken: null,
  enabled: true,
  tools: [{ name: "create_issue", inputSchema: { type: "object" } }],
  toolsFetchedAt: new Date(),
  userId: "user-1",
  ...overrides,
})

describe("[Success] buildMcpTools", () => {
  it("Builds a Tool for each cached Tool definition of enabled servers", () => {
    const tools = buildMcpTools(
      [
        buildServer({
          tools: [
            { name: "create_issue", inputSchema: { type: "object" } },
            { name: "list_issues", inputSchema: { type: "object" }, annotations: { readOnlyHint: true } },
          ],
        }),
        buildServer({ id: "server-2", name: "disabled", enabled: false }),
      ],
      mcpClient
    )

    expect(tools.map((t) => t.name)).toEqual(["mcp__github__create_issue", "mcp__github__list_issues"])
    expect(tools.map((t) => t.needApproval)).toEqual([true, false])
  })

  it("Skips a Tool whose name is already used by another server", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {})
    const tools = buildMcpTools(
      [buildServer({ id: "server-1", name: "my server" }), buildServer({ id: "server-2", name: "my_server" })],
      mcpClient
    )

    expect(tools).toHaveLength(1)
    expect(warn).toHaveBeenCalledOnce()
    warn.mockRestore()
  })
})
