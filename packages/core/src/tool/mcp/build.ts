import { McpClient } from "@wr/integration"
import { DomainMcpServer } from "@wr/shared"

import { ToolMcp } from "./tool"

/**
 * Builds the Tools of the given MCP servers from their cached Tool definitions.
 * Disabled servers are skipped. When two Tools end up with the same name (e.g. servers "my server" and "my_server"),
 * the later one is skipped, so a Tool is never replaced silently.
 */
export const buildMcpTools = (servers: DomainMcpServer[], mcpClient: McpClient): ToolMcp[] => {
  const tools = new Map<string, ToolMcp>()
  for (const server of servers) {
    if (!server.enabled) continue
    const connection = { name: server.name, url: server.url, accessToken: server.accessToken }
    for (const definition of server.tools) {
      const tool = new ToolMcp(connection, definition, mcpClient)
      if (tools.has(tool.name)) {
        console.warn(`Skipped MCP Tool "${definition.name}" on "${server.name}": the name "${tool.name}" is already used.`)
        continue
      }
      tools.set(tool.name, tool)
    }
  }
  return Array.from(tools.values())
}
