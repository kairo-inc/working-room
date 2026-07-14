import { inject, injectable } from "tsyringe"

import { FileAccessContext } from "@wr/access"
import { AgentProps, ChatEngine, ChatEngineConfig, EventBus } from "@wr/core"
import { TenantSource, UserSource } from "@wr/db"
import { ContextStore, IntegrationContext } from "@wr/integration"
import {
  AiModelTier,
  AiVendorConfigs,
  AiWorkingFolder,
  anthropicDefaultTierMapping,
  googleDefaultTierMapping,
  openAiDefaultTierMapping,
  selfHostedDefaultTierMapping,
} from "@wr/shared"
import { DiContainerContext, getPrivateContext } from "@wr/shared-node"

import { serverConfig } from "../config"
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

    const { tenantId, userId } = getPrivateContext()
    const tenant = await this.tenantSource.find("EntityTenant", { where: { id: tenantId } })
    const preferredVendor = tenant.aiVendor

    const openaiPriority = preferredVendor === "openai" ? 1 : preferredVendor != null ? null : process.env.OPENAI_API_KEY ? 1 : null
    const anthropicPriority =
      preferredVendor === "anthropic" ? 1 : preferredVendor != null ? null : process.env.ANTHROPIC_API_KEY ? 2 : null
    const googlePriority =
      preferredVendor === "google" ? 1 : preferredVendor != null ? null : process.env.GOOGLE_GENERATIVE_AI_API_KEY ? 3 : null
    const selfHostedPriority =
      preferredVendor === "selfHosted"
        ? 1
        : preferredVendor != null
          ? null
          : process.env.SELF_HOSTED_BASE_URL && process.env.SELF_HOSTED_API_KEY
            ? 4
            : null

    runtimeContainer.registerInstance<AiVendorConfigs>("AiVendorConfigs", {
      openai: {
        apiKey: process.env.OPENAI_API_KEY ?? "",
        priority: openaiPriority,
        tierMapping: { ...openAiDefaultTierMapping },
      },
      anthropic: {
        apiKey: process.env.ANTHROPIC_API_KEY ?? "",
        priority: anthropicPriority,
        tierMapping: { ...anthropicDefaultTierMapping },
      },
      google: {
        apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY ?? "",
        priority: googlePriority,
        tierMapping: { ...googleDefaultTierMapping },
      },
      selfHosted: {
        // The self-hosted API key is not required for the AI engine to function, as it can be configured in the tenant settings.
        apiKey: process.env.SELF_HOSTED_API_KEY ?? "not-required",
        baseUrl: process.env.SELF_HOSTED_BASE_URL ?? "",
        priority: selfHostedPriority,
        tierMapping: { ...selfHostedDefaultTierMapping },
      },
    })

    runtimeContainer.registerInstance<ChatEngineConfig>("ChatEngineConfig", {
      tierOverrides,
      workingFolder,
    })

    // external api integrations.
    const oauthClient = await this.userSource.findIfExists("EntityUserOauthClient", { where: { id: userId } })
    runtimeContainer.registerInstance<IntegrationContext>("IntegrationContext", {
      serverConfig: { baseUrl: serverConfig.HOST },
      // External api integrations can be added here, for example, Slack, Google, etc.
      // slack: new ContextStore(""),
      slack: oauthClient?.oauthClientsSlack[0] ? new ContextStore(oauthClient.oauthClientsSlack[0].accessToken) : undefined,
    })

    return runtimeContainer.resolve<ChatEngine>("ChatEngine")
  }

  async resolveFileService(): Promise<FileService> {
    const runtimeContainer = await this.createRuntimeContainer()
    return runtimeContainer.resolve<FileService>("FileService")
  }
}
