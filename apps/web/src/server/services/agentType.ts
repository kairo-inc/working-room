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

export type AgentServiceEditArgs = {
  id: string
  name?: string
  description?: string | null
  descriptionForAgent?: string
  tier?: AiModelTier
  prompt?: string
  workingFolderId?: string | null
}

export type AgentServiceDeleteArgs = {
  id: string
}

export type AgentServiceGetArgs = {
  id: string
}

export type AgentServiceGetListArgs = PageArg<AgentSortBy>

export abstract class AgentService {
  abstract create(args: AgentServiceCreateArgs): Promise<AppAgent>
  abstract edit(args: AgentServiceEditArgs): Promise<void>
  abstract delete(args: AgentServiceDeleteArgs): Promise<void>

  abstract get(args: AgentServiceGetArgs): Promise<AppAgent>
  abstract getList(args: AgentServiceGetListArgs): Promise<PageResult<AppAgent>>
}
