import { DomainMcpServer } from "@wr/shared"

import { AppMcpServer } from "../types/mcpServer"

export const mapMcpServerDomainToApp = (server: DomainMcpServer): AppMcpServer => {
  return {
    id: server.id,
    name: server.name,
    url: server.url,
    hasAccessToken: !!server.accessToken,
    enabled: server.enabled,
    toolNames: server.tools.map((t) => t.name),
    toolsFetchedAt: server.toolsFetchedAt ?? undefined,
  }
}
