import { inject, injectable } from "tsyringe"

import { FileAccessContext } from "@wr/access"
import { AgentProps, ChatEngine, ChatEngineConfig, EventBus } from "@wr/core"
import { TenantSource, UserSource } from "@wr/db"
import { AiModelTier, AiVendorConfigs, AiWorkingFolder, anthropicDefaultTierMapping, openAiDefaultTierMapping } from "@wr/shared"
import { DiContainerContext, getPrivateContext } from "@wr/shared-node"

import { getWebAppDiContainer } from "../container"
import { FileService } from "../services/fileType"

type ResolveEngineArgs = {
  eventBus?: EventBus
  agents?: AgentProps[]
  workingFolder?: AiWorkingFolder
  tierOverrides?: Partial<Record<string, AiModelTier>>
}

@injectable()
export class Resolver {
  constructor(
    // TODO: Get the tenant/user config from these sources.
    @inject("UserSource") private userSource: UserSource,
    @inject("TenantSource") private tenantSource: TenantSource
  ) {}

  private async createRuntimeContainer(): Promise<DiContainerContext> {
    const { userId } = getPrivateContext()
    const runtimeContainer = getWebAppDiContainer().createChildContainer()
    runtimeContainer.registerInstance<FileAccessContext>("FileAccessContext", { userId })
    return runtimeContainer
  }

  async resolveEngine(args: ResolveEngineArgs): Promise<ChatEngine> {
    const { eventBus, agents, tierOverrides, workingFolder } = args
    const runtimeContainer = await this.createRuntimeContainer()
    if (eventBus) {
      runtimeContainer.registerInstance<EventBus>("EventBus", eventBus)
    }
    if (agents && agents.length > 0) {
      runtimeContainer.registerInstance<AgentProps[]>("AdditionalAgents", agents)
    }

    runtimeContainer.registerInstance<AiVendorConfigs>("AiVendorConfigs", {
      openai: {
        apiKey: process.env.OPENAI_API_KEY ?? "",
        // Lower number means higher priority.
        // This is used when the system needs to choose a default vendor for a model that is supported by multiple vendors.
        priority: process.env.OPENAI_API_KEY ? 1 : null,
        // You can update the tier mapping as needed. This is just an example of how to provide it.
        // Otherwise, the system will use the default tier mapping.
        tierMapping: {
          ...openAiDefaultTierMapping,
          // You can override specific model tiers here.
          // light: "gpt-4o-mini",
        },
      },
      anthropic: {
        apiKey: process.env.ANTHROPIC_API_KEY ?? "",
        // If both OpenAI and Anthropic are available, we will prioritize OpenAI by default since it generally has a wider range of model options.
        // You can adjust the priority as needed.
        priority: process.env.ANTHROPIC_API_KEY ? 2 : null,
        tierMapping: { ...anthropicDefaultTierMapping },
      },
    })

    runtimeContainer.registerInstance<ChatEngineConfig>("ChatEngineConfig", {
      tierOverrides,
      workingFolder,
    })

    return runtimeContainer.resolve<ChatEngine>("ChatEngine")
  }

  async resolveFileService(): Promise<FileService> {
    const runtimeContainer = await this.createRuntimeContainer()
    return runtimeContainer.resolve<FileService>("FileService")
  }
}
