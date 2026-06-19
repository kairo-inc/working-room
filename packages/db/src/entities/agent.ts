import { Agent, Prisma } from "@prisma/client"

// EntityAgent.
export class EntityAgent implements Omit<Agent, "deletedAt" | "tenantId" | "userId" | "workingFolderId"> {
  id: string
  createdAt: Date
  updatedAt: Date
  name: string
  description: string | null
  descriptionForAgent: string
  tier: string
  prompt: string
  workingFolder: {
    id: string
    name: string
    mimeType: string
    parentId?: string | null
  } | null

  static select = {
    id: true,
    createdAt: true,
    updatedAt: true,
    name: true,
    description: true,
    descriptionForAgent: true,
    tier: true,
    prompt: true,
    workingFolder: {
      select: {
        id: true,
        name: true,
        mimeType: true,
        parentId: true,
      },
    },
  } as const satisfies Prisma.AgentSelect
}

export type AgentSortBy = "createdAt" | "updatedAt" | "name" | "tier"
