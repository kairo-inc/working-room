import { Agent, Prisma } from "@prisma/client"

// EntityAgent.
export class EntityAgent implements Omit<Agent, "deletedAt" | "tenantId" | "userId"> {
  id: string
  createdAt: Date
  updatedAt: Date
  name: string
  description: string | null
  descriptionForAgent: string
  tier: string
  prompt: string
  workingFolderId: string | null

  static select = {
    id: true,
    createdAt: true,
    updatedAt: true,
    name: true,
    description: true,
    descriptionForAgent: true,
    tier: true,
    prompt: true,
    workingFolderId: true,
  } as const satisfies Prisma.AgentSelect
}

export type AgentSortBy = "createdAt" | "updatedAt" | "name" | "tier"
