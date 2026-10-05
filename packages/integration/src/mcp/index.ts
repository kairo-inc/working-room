import { Client } from "@modelcontextprotocol/sdk/client/index.js"
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js"
import { injectable } from "tsyringe"

import { DomainMcpServerTool } from "@wr/shared"

import { McpClient, McpClientCallToolArgs, McpServerConnection, McpToolResult } from "./type"

export * from "./type"

const CLIENT_INFO = { name: "working-room", version: "1.0.0" }

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
    await client.connect(transport)
    try {
      return await fn(client)
    } finally {
      await client.close()
    }
  }

  async listTools(server: McpServerConnection): Promise<DomainMcpServerTool[]> {
    return this.withClient(server, async (client) => {
      const tools: DomainMcpServerTool[] = []
      let cursor: string | undefined
      do {
        const result = await client.listTools(cursor ? { cursor } : undefined)
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
      const result = await client.callTool({ name: args.name, arguments: args.arguments })
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
