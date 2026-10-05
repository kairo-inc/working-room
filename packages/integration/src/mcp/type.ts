import { DomainMcpServerTool } from "@wr/shared"

// Connection info of an MCP server registered by a User. Only the Streamable HTTP transport is supported.
export type McpServerConnection = {
  id: string
  name: string
  url: string
  // Sent as a Bearer token in the Authorization header, if set.
  accessToken: string | null
}

export type McpClientCallToolArgs = {
  // The Tool's own name on the MCP server, not the name exposed to the LLM.
  name: string
  arguments: Record<string, unknown>
}

// A content item of a tools/call result. Only text is used as is; other types are summarized.
export type McpToolResultContent = { type: "text"; text: string } | { type: string; [key: string]: unknown }

export type McpToolResult = {
  content: McpToolResultContent[]
  structuredContent?: Record<string, unknown>
  // True when the Tool itself reported an error, as opposed to a protocol or connection error.
  isError?: boolean
}

export abstract class McpClient {
  abstract listTools(server: McpServerConnection): Promise<DomainMcpServerTool[]>
  abstract callTool(server: McpServerConnection, args: McpClientCallToolArgs): Promise<McpToolResult>
}
