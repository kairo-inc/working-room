import { McpServer, Prisma } from "@prisma/client"

// EntityMcpServer.
export class EntityMcpServer implements Omit<McpServer, "deletedAt"> {
  id: string
  createdAt: Date
  updatedAt: Date
  name: string
  url: string
  accessToken: string | null
  enabled: boolean
  tools: string
  toolsFetchedAt: Date | null
  userId: string

  static select = {
    id: true,
    createdAt: true,
    updatedAt: true,
    name: true,
    url: true,
    accessToken: true,
    enabled: true,
    tools: true,
    toolsFetchedAt: true,
    userId: true,
  } as const satisfies Prisma.McpServerSelect
}

export const McpServerSortByList = ["createdAt", "updatedAt", "name"] as const

export type McpServerSortBy = (typeof McpServerSortByList)[number]
