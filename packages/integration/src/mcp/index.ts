import { Client } from "@modelcontextprotocol/sdk/client/index.js"
import { StreamableHTTPClientTransport, StreamableHTTPError } from "@modelcontextprotocol/sdk/client/streamableHttp.js"
import { ErrorCode, McpError } from "@modelcontextprotocol/sdk/types.js"
import { injectable } from "tsyringe"

import { DomainMcpServerTool, McpServerAuthError, McpServerConnectionError, McpToolNotFoundError } from "@wr/shared"

import { McpClient, McpClientCallToolArgs, McpServerConnection, McpToolResult } from "./type"

export * from "./type"

const CLIENT_INFO = { name: "working-room", version: "1.0.0" }

// Connecting includes the initialize handshake, which should be quick even for slow servers.
const CONNECT_TIMEOUT_MSEC = 10_000
// Tools may do real work (e.g. search, API calls), so they get more time than connecting.
const REQUEST_TIMEOUT_MSEC = 60_000

const isAuthError = (e: unknown) => e instanceof StreamableHTTPError && (e.code === 401 || e.code === 403)

const isConnectionError = (e: unknown) =>
  e instanceof StreamableHTTPError ||
  (e instanceof McpError && (e.code === ErrorCode.RequestTimeout || e.code === ErrorCode.ConnectionClosed)) ||
  // fetch() throws a TypeError when the host can not be reached.
  e instanceof TypeError

// Servers report an unknown Tool as an invalid params or method error. Other errors with these codes, such as invalid
// arguments, are left as they are.
const isToolNotFoundError = (e: unknown) =>
  e instanceof McpError &&
  (e.code === ErrorCode.InvalidParams || e.code === ErrorCode.MethodNotFound) &&
  /not found|unknown tool/i.test(e.message)

const errorMessage = (e: unknown) => (e instanceof Error ? e.message : String(e))

/**
 * MCP client over the Streamable HTTP transport.
 * A new session is opened for each operation and closed right after, so no connection is kept between Tool calls.
 */
@injectable()
export class McpClientImpl extends McpClient {
  private async withClient<T>(server: McpServerConnection, fn: (client: Client) => Promise<T>): Promise<T> {
    const headers: Record<string, string> = server.accessToken ? { Authorization: `Bearer ${server.accessToken}` } : {}
    const transport = new StreamableHTTPClientTransport(new URL(server.url), { requestInit: { headers } })
    const client = new Client(CLIENT_INFO)
    try {
      // The SDK closes the client itself when connect() fails.
      await client.connect(transport, { timeout: CONNECT_TIMEOUT_MSEC })
    } catch (e) {
      if (isAuthError(e)) {
        throw new McpServerAuthError(`The MCP server "${server.name}" rejected the access token: ${errorMessage(e)}`, { cause: e })
      }
      throw new McpServerConnectionError(`Could not connect to the MCP server "${server.name}": ${errorMessage(e)}`, { cause: e })
    }
    try {
      return await fn(client)
    } catch (e) {
      if (isAuthError(e)) {
        throw new McpServerAuthError(`The MCP server "${server.name}" rejected the access token: ${errorMessage(e)}`, { cause: e })
      }
      if (isConnectionError(e)) {
        throw new McpServerConnectionError(`Lost the connection to the MCP server "${server.name}": ${errorMessage(e)}`, { cause: e })
      }
      throw e
    } finally {
      await client.close()
    }
  }

  async listTools(server: McpServerConnection): Promise<DomainMcpServerTool[]> {
    return this.withClient(server, async (client) => {
      const tools: DomainMcpServerTool[] = []
      let cursor: string | undefined
      do {
        const result = await client.listTools(cursor ? { cursor } : undefined, { timeout: REQUEST_TIMEOUT_MSEC })
        for (const tool of result.tools) {
          tools.push({
            name: tool.name,
            description: tool.description,
            inputSchema: tool.inputSchema,
            annotations: tool.annotations
              ? { readOnlyHint: tool.annotations.readOnlyHint, destructiveHint: tool.annotations.destructiveHint }
              : undefined,
          })
        }
        cursor = result.nextCursor
      } while (cursor)
      return tools
    })
  }

  async callTool(server: McpServerConnection, args: McpClientCallToolArgs): Promise<McpToolResult> {
    return this.withClient(server, async (client) => {
      let result: Awaited<ReturnType<typeof client.callTool>>
      try {
        result = await client.callTool({ name: args.name, arguments: args.arguments }, undefined, { timeout: REQUEST_TIMEOUT_MSEC })
      } catch (e) {
        if (isToolNotFoundError(e)) {
          throw new McpToolNotFoundError(`The Tool "${args.name}" was not found on the MCP server "${server.name}".`, { cause: e })
        }
        throw e
      }
      // Servers implementing protocol versions before 2024-11-05 return "toolResult" instead of "content".
      if (!("content" in result) || !Array.isArray(result.content)) {
        return { content: [{ type: "text", text: JSON.stringify(result.toolResult ?? null) }] }
      }
      return {
        content: result.content,
        // Validated as an object by the SDK, but typed as unknown after narrowing the compatibility result above.
        structuredContent: result.structuredContent as Record<string, unknown> | undefined,
        isError: result.isError === true,
      }
    })
  }
}
