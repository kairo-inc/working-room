import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js"
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js"
import { CallToolRequestSchema, ErrorCode, ListToolsRequestSchema, McpError } from "@modelcontextprotocol/sdk/types.js"
import { Server as HttpServer, createServer } from "node:http"
import { AddressInfo } from "node:net"
import { afterEach, beforeEach, describe, expect, it } from "vitest"

import { McpServerAuthError, McpServerConnectionError, McpToolNotFoundError } from "@wr/shared"

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
  // The low-level server is used to control pagination and errors directly.
  const { server } = new McpServer({ name: "test-server", version: "1.0.0" }, { capabilities: { tools: {} } })
  server.setRequestHandler(ListToolsRequestSchema, async (request) => {
    const page = Number(request.params?.cursor ?? 0)
    return { tools: toolPages[page], nextCursor: page + 1 < toolPages.length ? String(page + 1) : undefined }
  })
  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name } = request.params
    if (name === "create_issue") {
      if (typeof request.params.arguments?.title !== "string") {
        throw new McpError(ErrorCode.InvalidParams, "Invalid arguments: title is required")
      }
      return { content: [{ type: "text", text: `Created "${request.params.arguments.title}".` }] }
    }
    if (name === "failing_tool") {
      return { content: [{ type: "text", text: "Something went wrong." }], isError: true }
    }
    throw new McpError(ErrorCode.InvalidParams, `Tool ${name} not found`)
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
    connection = { name: "test", url: `http://127.0.0.1:${port}/mcp`, accessToken: "secret-token" }
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
    const result = await new McpClientImpl().callTool(connection, { name: "failing_tool", arguments: {} })

    expect(result.isError).toBe(true)
  })

  it("[Failure] Throws McpToolNotFoundError when the Tool does not exist on the server", async () => {
    const result = new McpClientImpl().callTool(connection, { name: "deleted_tool", arguments: {} })

    await expect(result).rejects.toThrow(McpToolNotFoundError)
  })

  it("[Failure] Passes through other errors of the Tool call, such as invalid arguments", async () => {
    const result = new McpClientImpl().callTool(connection, { name: "create_issue", arguments: {} })

    await expect(result).rejects.toThrow(/Invalid arguments/)
    await expect(result).rejects.not.toThrow(McpToolNotFoundError)
  })

  it("[Failure] Throws McpServerAuthError when the server rejects the access token", async () => {
    await new Promise<void>((resolve) => httpServer.close(() => resolve()))
    httpServer = createServer((_, res) => res.writeHead(401).end("Unauthorized"))
    await new Promise<void>((resolve) => httpServer.listen(0, "127.0.0.1", resolve))
    const { port } = httpServer.address() as AddressInfo

    const result = new McpClientImpl().listTools({ ...connection, url: `http://127.0.0.1:${port}/mcp` })

    await expect(result).rejects.toThrow(McpServerAuthError)
  })

  it("[Failure] Throws McpServerConnectionError when the MCP server can not be reached", async () => {
    await new Promise<void>((resolve) => httpServer.close(() => resolve()))
    httpServer = createServer()
    httpServer.listen(0)

    await expect(new McpClientImpl().listTools(connection)).rejects.toThrow(McpServerConnectionError)
  })

  it("[Failure] Throws McpServerConnectionError when the server returns an unexpected HTTP error", async () => {
    await new Promise<void>((resolve) => httpServer.close(() => resolve()))
    httpServer = createServer((_, res) => res.writeHead(500).end())
    await new Promise<void>((resolve) => httpServer.listen(0, "127.0.0.1", resolve))
    const { port } = httpServer.address() as AddressInfo

    const result = new McpClientImpl().listTools({ ...connection, url: `http://127.0.0.1:${port}/mcp` })

    await expect(result).rejects.toThrow(McpServerConnectionError)
  })
})
