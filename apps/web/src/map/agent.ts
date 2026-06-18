import { EntityAgent } from "@wr/db"
import { AiModelTier } from "@wr/shared"

import { AppAgent } from "../types/agent"

export const mapAgentEntityToApp = (agent: EntityAgent): AppAgent => {
  return {
    id: agent.id,
    name: agent.name,
    description: agent.description ?? undefined,
    descriptionForAgent: agent.descriptionForAgent,
    tier: agent.tier as AiModelTier,
    prompt: agent.prompt,
    workingFolderId: agent.workingFolderId ?? undefined,
  }
}
