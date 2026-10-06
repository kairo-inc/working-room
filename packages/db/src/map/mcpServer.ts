import z from "zod"

import { DomainMcpServer } from "@wr/shared"

import { EntityMcpServer } from "../entities"

const toolsSchema = z.array(
  z.object({
    name: z.string(),
    description: z.string().optional(),
    inputSchema: z.record(z.string(), z.unknown()),
    annotations: z
      .object({
        readOnlyHint: z.boolean().optional(),
        destructiveHint: z.boolean().optional(),
      })
      .optional(),
  })
)

const parseTools = (tools: string) => {
  try {
    return toolsSchema.safeParse(JSON.parse(tools))
  } catch {
    return toolsSchema.safeParse(undefined)
  }
}

export const mapMcpServerEntityToDomain = (entity: EntityMcpServer): DomainMcpServer => {
  // Treat broken cache as not fetched, so the Tool definitions are fetched again.
  const parsed = parseTools(entity.tools)
  return {
    id: entity.id,
    createdAt: entity.createdAt,
    updatedAt: entity.updatedAt,
    name: entity.name,
    url: entity.url,
    accessToken: entity.accessToken,
    enabled: entity.enabled,
    tools: parsed.success ? parsed.data : [],
    toolsFetchedAt: parsed.success ? entity.toolsFetchedAt : null,
    userId: entity.userId,
  }
}
