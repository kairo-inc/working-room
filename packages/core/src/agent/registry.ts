import { inject, injectAll, injectable } from "tsyringe"

import type { Agent, AgentProps } from "./base"
import { AgentBuilder } from "./build"

@injectable()
export class AgentRegistry {
  // Default agent catalog.
  private agents = new Map<string, Agent>()

  // Default agents are registered in the constructor, but additional agents can be registered using the register method.
  constructor(
    @inject("AgentBuilder") private builder: AgentBuilder,
    @injectAll("AgentProps") agentProps: AgentProps[] = [],
    // User-Defined Agents
    @inject("AdditionalAgents") additionalAgents: AgentProps[] = []
  ) {
    agentProps.forEach((agent) => this.register(this.builder.buildAgent(agent)))
    additionalAgents.forEach((agent) => this.register(this.builder.buildAgent(agent)))
  }

  register(agent: AgentProps) {
    this.agents.set(agent.name, this.builder.buildAgent(agent))
  }

  get(name: string): Agent {
    const agent = this.agents.get(name)
    if (!agent) {
      throw new Error(`Agent of name ${name} not found`)
    }
    return agent
  }

  getUserFacingAgent(): Agent {
    const userFacingAgents = Array.from(this.agents.values()).filter((agent) => agent.isUserFacing)
    if (userFacingAgents.length === 0) {
      throw new Error("No user-facing agent found in the registry")
    } else if (userFacingAgents.length > 1) {
      throw new Error("Multiple user-facing agents found in the registry. Please ensure only one agent is marked as user-facing.")
    }
    return userFacingAgents[0]!
  }

  // Returns agents that can be spawned as sub-agents (i.e. not user-facing).
  getSpawnableAgents(): Agent[] {
    return Array.from(this.agents.values()).filter((agent) => !agent.isUserFacing)
  }
}
