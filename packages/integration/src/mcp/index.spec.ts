import { Server } from "@modelcontextprotocol/sdk/server/index.js"
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js"
import { CallToolRequestSchema, ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js"
import { Server as HttpServer, createServer } from "node:http"
import { AddressInfo } from "node:net"
import { afterEach, beforeEach, describe, expect, it } from "vitest"

import { McpClientImpl } from "./index"
import { McpServerConnection } from "./type"

// Tools served by the test MCP server, split into two pages to exercise pagination.
const toolPages = [
  [
    {
      name: "list_issues",
      description: "List issues.",
      inputSchema: { type: "object" as const, properties: {} },
      annotations: { readOnlyHint: true },
    },
  ],
  [
    {
      name: "create_issue",
      inputSchema: { type: "object" as const, properties: { title: { type: "string" } }, required: ["title"] },
      annotations: { readOnlyHint: false, destructiveHint: false },
    },
  ],
]

const buildMcpServer = () => {
  const server = new Server({ name: "test-server", version: "1.0.0" }, { capabilities: { tools: {} } })
  server.setRequestHandler(ListToolsRequestSchema, async (request) => {
    const page = Number(request.params?.cursor ?? 0)
    return { tools: toolPages[page], nextCursor: page + 1 < toolPages.length ? String(page + 1) : undefined }
  })
  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    if (request.params.name === "create_issue") {
      return { content: [{ type: "text", text: `Created "${request.params.arguments?.title}".` }] }
    }
    return { content: [{ type: "text", text: "Unknown tool." }], isError: true }
  })
  return server
}

describe("McpClientImpl", () => {
  let httpServer: HttpServer
  let connection: McpServerConnection
  let receivedAuthHeaders: (string | undefined)[]

  beforeEach(async () => {
    receivedAuthHeaders = []
    // Stateless Streamable HTTP server: a new MCP server and transport per HTTP request.
    httpServer = createServer(async (req, res) => {
      receivedAuthHeaders.push(req.headers.authorization)
      const server = buildMcpServer()
      const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined })
      res.on("close", () => {
        void transport.close()
        void server.close()
      })
      await server.connect(transport)
      await transport.handleRequest(req, res)
    })
    await new Promise<void>((resolve) => httpServer.listen(0, "127.0.0.1", resolve))
    const { port } = httpServer.address() as AddressInfo
    connection = { id: "server-1", name: "test", url: `http://127.0.0.1:${port}/mcp`, accessToken: "secret-token" }
  })

  afterEach(async () => {
    await new Promise<void>((resolve) => httpServer.close(() => resolve()))
  })

  it("[Success] Lists Tools across all pages with their annotations", async () => {
    const tools = await new McpClientImpl().listTools(connection)

    expect(tools).toEqual([
      {
        name: "list_issues",
        description: "List issues.",
        inputSchema: { type: "object", properties: {} },
        annotations: { readOnlyHint: true, destructiveHint: undefined },
      },
      {
        name: "create_issue",
        description: undefined,
        inputSchema: { type: "object", properties: { title: { type: "string" } }, required: ["title"] },
        annotations: { readOnlyHint: false, destructiveHint: false },
      },
    ])
  })

  it("[Success] Sends the access token as a Bearer token", async () => {
    await new McpClientImpl().listTools(connection)

    expect(receivedAuthHeaders.length).toBeGreaterThan(0)
    expect(receivedAuthHeaders.every((h) => h === "Bearer secret-token")).toBe(true)
  })

  it("[Success] Sends no Authorization header without an access token", async () => {
    await new McpClientImpl().listTools({ ...connection, accessToken: null })

    expect(receivedAuthHeaders.every((h) => h === undefined)).toBe(true)
  })

  it("[Success] Calls a Tool and returns its content", async () => {
    const result = await new McpClientImpl().callTool(connection, { name: "create_issue", arguments: { title: "Bug" } })

    expect(result).toEqual({ content: [{ type: "text", text: 'Created "Bug".' }], structuredContent: undefined, isError: false })
  })

  it("[Success] Returns isError when the Tool reports an error", async () => {
    const result = await new McpClientImpl().callTool(connection, { name: "unknown", arguments: {} })

    expect(result.isError).toBe(true)
  })

  it("[Failure] Throws when the MCP server can not be reached", async () => {
    await new Promise<void>((resolve) => httpServer.close(() => resolve()))
    httpServer = createServer()
    httpServer.listen(0)

    await expect(new McpClientImpl().listTools(connection)).rejects.toThrow()
  })
})
