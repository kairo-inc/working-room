import { inject, injectable } from "tsyringe"

import { AgentSource } from "@wr/db"
import { PageResult } from "@wr/shared"
import { getPrivateContext } from "@wr/shared-node"

import { mapAgentEntityToApp } from "../../map/agent"
import { AppAgent } from "../../types/agent"
import { AgentService, AgentServiceCreateArgs, AgentServiceGetListArgs } from "./agentType"

@injectable()
export class AgentServiceImpl extends AgentService {
  constructor(@inject("AgentSource") private agentSource: AgentSource) {
    super()
  }

  async create(args: AgentServiceCreateArgs): Promise<AppAgent> {
    const { name, description, descriptionForAgent, tier, prompt, workingFolderId } = args
    const { userId, tenantId } = getPrivateContext()
    const agent = await this.agentSource.create({
      data: {
        name,
        description: description ?? null,
        descriptionForAgent,
        tier,
        prompt,
        workingFolder: workingFolderId ? { connect: { id: workingFolderId } } : undefined,
        user: { connect: { id: userId } },
        tenant: { connect: { id: tenantId } },
      },
    })
    return mapAgentEntityToApp(agent)
  }

  async getList(args: AgentServiceGetListArgs): Promise<PageResult<AppAgent>> {
    const { ...page } = args
    const { data, ...rest } = await this.agentSource.findMany("EntityAgent", {
      where: {},
      ...page,
    })
    return {
      data: data.map(mapAgentEntityToApp),
      ...rest,
    }
  }
}
