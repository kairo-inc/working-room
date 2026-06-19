import { EntityAgent } from "@wr/db"
import { AiModelTier, MimeType } from "@wr/shared"

import { AppAgent } from "../types/agent"

export const mapAgentEntityToApp = (agent: EntityAgent): AppAgent => {
  return {
    id: agent.id,
    name: agent.name,
    description: agent.description ?? undefined,
    descriptionForAgent: agent.descriptionForAgent,
    tier: agent.tier as AiModelTier,
    prompt: agent.prompt,
    workingFolder: agent.workingFolder
      ? {
          id: agent.workingFolder.id,
          name: agent.workingFolder.name,
          mimeType: agent.workingFolder.mimeType as MimeType,
          parentId: agent.workingFolder.parentId ?? undefined,
        }
      : undefined,
  }
}
