import { AgentSortBy } from "@wr/db"
import { AiModelTier, PageArg, PageResult } from "@wr/shared"

import { AppAgent } from "../../types/agent"

export type AgentServiceCreateArgs = {
  name: string
  description?: string
  descriptionForAgent: string
  tier: AiModelTier
  prompt: string
  workingFolderId?: string
}

export type AgentServiceGetListArgs = PageArg<AgentSortBy>

export abstract class AgentService {
  abstract create(args: AgentServiceCreateArgs): Promise<AppAgent>
  abstract getList(args: AgentServiceGetListArgs): Promise<PageResult<AppAgent>>
}
