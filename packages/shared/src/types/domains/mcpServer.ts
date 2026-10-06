// A Tool definition provided by an MCP server, as returned by tools/list.
export type DomainMcpServerTool = {
  name: string
  description?: string
  // JSON Schema of the Tool's input.
  inputSchema: Record<string, unknown>
  // Hints about the Tool's behavior, reported by the MCP server.
  annotations?: {
    // True if the Tool does not modify its environment.
    readOnlyHint?: boolean
    // True if the Tool may perform destructive updates. Only meaningful when readOnlyHint is not true.
    destructiveHint?: boolean
  }
}

export type DomainMcpServer = {
  id: string
  createdAt: Date
  updatedAt: Date
  name: string
  url: string
  accessToken: string | null
  enabled: boolean
  tools: DomainMcpServerTool[]
  toolsFetchedAt: Date | null
  userId: string
}
