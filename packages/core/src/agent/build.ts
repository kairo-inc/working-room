import { inject, injectable } from "tsyringe"

import { AiVendorConfigs } from "@wr/shared"

import { Agent, AgentProps } from "./base"

@injectable()
export class AgentBuilder {
  constructor(@inject("AiVendorConfigs") private aiVendorConfigs: AiVendorConfigs) {}

  buildAgent(args: AgentProps): Agent {
    return new Agent(this.aiVendorConfigs, args)
  }
}
