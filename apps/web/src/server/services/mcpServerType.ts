import { AppMcpServer } from "../../types/mcpServer"

export type McpServerServiceCreateArgs = {
  name: string
  url: string
  accessToken?: string
}

export type McpServerServiceEditArgs = {
  id: string
  name?: string
  url?: string
  // undefined keeps the current token, null removes it.
  accessToken?: string | null
  enabled?: boolean
}

export type McpServerServiceDeleteArgs = {
  id: string
}

export type McpServerServiceRefreshToolsArgs = {
  id: string
}

// MCP servers are private to each User, so every operation is limited to the current User's servers.
export abstract class McpServerService {
  abstract getList(): Promise<AppMcpServer[]>
  // Fetches the Tool definitions from the server before saving, and fails if the server can not be reached.
  abstract create(args: McpServerServiceCreateArgs): Promise<AppMcpServer>
  // Fetches the Tool definitions again when the URL or access token changes.
  abstract edit(args: McpServerServiceEditArgs): Promise<AppMcpServer>
  abstract delete(args: McpServerServiceDeleteArgs): Promise<void>
  abstract refreshTools(args: McpServerServiceRefreshToolsArgs): Promise<AppMcpServer>
}
