import { EntityAgent } from "@wr/db"

import { AppAgent } from "../types/agent"

export const mapAgentEntityToApp = (agent: EntityAgent): AppAgent => {
  return {
    name: agent.name,
    description: agent.description ?? undefined,
    descriptionForAgent: agent.descriptionForAgent,
    tier: agent.tier,
    prompt: agent.prompt,
    workingFolderId: agent.workingFolderId ?? undefined,
  }
}
