import { createAnthropic } from "@ai-sdk/anthropic"
import { createGoogleGenerativeAI } from "@ai-sdk/google"
import { createOpenAI } from "@ai-sdk/openai"
import {
  APICallError,
  AssistantModelMessage,
  ModelMessage,
  Output,
  ToolModelMessage,
  UserModelMessage,
  generateText as aiGenerateText,
  streamText as aiStreamText,
  createProviderRegistry,
} from "ai"
import z from "zod"

import {
  AiModel,
  AiModelTier,
  AiModelTierMapping,
  AiProviderError,
  AiRateLimitError,
  AiVendor,
  AiVendorConfigs,
  AiVendorName,
  DomainMessageWithoutId,
  DomainToolDef,
  ImplementationError,
  InvalidAiConfigError,
  NotFoundError,
  NotSupportedError,
  aiVendorAnthropic,
  aiVendorGoogle,
  aiVendorOpenAI,
  isAiVendorConfigured,
  isDomainAssistantMessage,
  isDomainSystemMessage,
  isDomainToolMessage,
  isDomainUserMessage,
} from "@wr/shared"

import { ConsumedToken } from "./types"

function throwAsAiError(error: unknown): never {
  if (error instanceof APICallError) {
    if (error.statusCode === 429) {
      throw new AiRateLimitError(`AI provider rate limit exceeded: ${error.message}`, { cause: error })
    }
    throw new AiProviderError(`AI provider returned HTTP ${error.statusCode ?? "unknown"}: ${error.message}`, { cause: error })
  }
  throw new AiProviderError(`AI provider error: ${error instanceof Error ? error.message : String(error)}`, { cause: error })
}

const vendorByPrefix: Record<string, AiVendor> = {
  openai: aiVendorOpenAI,
  anthropic: aiVendorAnthropic,
  google: aiVendorGoogle,
}

const buildRegistry = (vendorConfigs: AiVendorConfigs) => {
  const providers: Record<
    string,
    ReturnType<typeof createOpenAI> | ReturnType<typeof createAnthropic> | ReturnType<typeof createGoogleGenerativeAI>
  > = {}
  if (vendorConfigs.openai?.apiKey) providers.openai = createOpenAI({ apiKey: vendorConfigs.openai.apiKey })
  if (vendorConfigs.anthropic?.apiKey) providers.anthropic = createAnthropic({ apiKey: vendorConfigs.anthropic.apiKey })
  if (vendorConfigs.google?.apiKey) providers.google = createGoogleGenerativeAI({ apiKey: vendorConfigs.google.apiKey })
  return {
    providers,
    registry: createProviderRegistry(providers),
  }
}

export const parseConsumedTokens = (
  model: string,
  provider: AiVendorName,
  usage: Awaited<ReturnType<typeof aiGenerateText>>["usage"]
): ConsumedToken => {
  return {
    inputTokens: usage.inputTokens ?? 0,
    outputTokens: usage.outputTokens ?? 0,
    noCacheInputTokens: usage.inputTokenDetails?.noCacheTokens ?? 0,
    cachedInputTokens: (usage.inputTokenDetails?.cacheReadTokens ?? 0) + (usage.inputTokenDetails?.cacheWriteTokens ?? 0),
    model,
    provider,
  }
}

type ModelConstructorArgs = {
  modelTier: AiModelTier
  vendorConfigs: AiVendorConfigs
}

export class Model {
  private model: AiModel
  private vendor: AiVendor
  private registry: ReturnType<typeof createProviderRegistry>
  private provider: ReturnType<typeof createOpenAI> | ReturnType<typeof createAnthropic> | ReturnType<typeof createGoogleGenerativeAI>

  constructor(args: ModelConstructorArgs) {
    const { modelTier, vendorConfigs } = args
    const prefferedVendor = Object.entries(vendorConfigs)
      .filter(([_, c]) => c.priority !== null)
      .sort((a, b) => a[1].priority! - b[1].priority!)[0]

    if (!prefferedVendor) {
      throw new InvalidAiConfigError("No AI vendors are properly configured. Please provide a valid API key for at least one vendor.")
    }
    const [vendorKey, vendorConfig] = prefferedVendor
    const vendor = vendorByPrefix[vendorKey]

    if (vendor && !isAiVendorConfigured(vendor, vendorConfigs)) {
      throw new InvalidAiConfigError(`AiVendor "${vendor.name}" is not configured. Required keys: ${vendor.requiredKeys.join(", ")}`)
    } else if (!vendor) {
      throw new NotFoundError(`No AiVendor found for the name "${vendorKey}". Available vendors: ${Object.keys(vendorByPrefix).join(", ")}`)
    }

    const tierMapping: AiModelTierMapping = vendorConfig.tierMapping
    const { registry, providers } = buildRegistry(vendorConfigs)
    // NOTE: Need prefix to use "registry.languageModel(this.model)" since the registry is built with the vendor name as prefix.
    this.model = `${vendor.name}:${tierMapping[modelTier]}` as AiModel
    this.vendor = vendor
    this.registry = registry
    this.provider = providers[vendor.name]!
  }

  public getVendorName(): string {
    return this.vendor.name
  }

  async generateText(args: {
    messages: DomainMessageWithoutId[]
    tools?: Record<string, DomainToolDef>
  }): Promise<{ content: Awaited<ReturnType<typeof aiGenerateText>>["content"]; tokens: ConsumedToken }> {
    const { messages, tools } = args
    const normalizedMessages = await this.buildContext(messages)
    const contextMessages = normalizedMessages.filter((m) => m.role !== "system")
    const systemMessages = normalizedMessages.filter((m) => m.role === "system")
    try {
      const result = await aiGenerateText({
        model: this.registry.languageModel(this.model),
        system: systemMessages,
        messages: contextMessages,
        tools,
      })
      const { usage, content } = result
      const tokens = parseConsumedTokens(this.model, this.vendor.name, usage)
      return { content, tokens }
    } catch (error) {
      throwAsAiError(error)
    }
  }

  async streamText(args: {
    messages: DomainMessageWithoutId[]
    tools?: Record<string, DomainToolDef>
  }): Promise<ReturnType<typeof aiStreamText>> {
    try {
      const { messages, tools } = args
      const normalizedMessages = await this.buildContext(messages)
      const contextMessages = normalizedMessages.filter((m) => m.role !== "system")
      const systemMessages = normalizedMessages.filter((m) => m.role === "system")
      return aiStreamText({
        model: this.registry.languageModel(this.model),
        system: systemMessages,
        messages: contextMessages,
        tools,
      })
    } catch (error) {
      throwAsAiError(error)
    }
  }

  // Can be called with model configurations in a instance method.
  parseUsage(usage: Awaited<ReturnType<typeof aiGenerateText>>["usage"]): ConsumedToken {
    return parseConsumedTokens(this.model, this.vendor.name, usage)
  }

  async generateStructuredData<Data>(args: {
    messages: DomainMessageWithoutId[]
    outputSchema: z.ZodType<Data>
    tools?: Record<string, DomainToolDef>
  }): Promise<{ data: Data; tokens: ConsumedToken }> {
    const { messages, tools, outputSchema } = args
    const normalizedMessages = await this.buildContext(messages)
    const contextMessages = normalizedMessages.filter((m) => m.role !== "system")
    const systemMessages = normalizedMessages.filter((m) => m.role === "system")
    const result = await aiGenerateText({
      model: this.registry.languageModel(this.model),
      system: systemMessages,
      messages: contextMessages,
      tools,
      output: Output.object({ schema: outputSchema }),
    })

    const tokens = parseConsumedTokens(this.model, this.vendor.name, result.usage)
    if (result.output && outputSchema) {
      return { data: result.output, tokens }
    } else {
      throw new Error("Model did not return output matching the schema")
    }
  }

  async webSearch(
    args: { query: string },
    options?: {
      maxRetries?: number
      maxOutputTokens?: number
    }
  ): Promise<{ text: string; tokens: ConsumedToken }> {
    const { query } = args
    const maxRetries = options?.maxRetries ?? 5
    const maxOutputTokens = options?.maxOutputTokens ?? 1024 * 8
    if (this.vendor.name === "openai") {
      const tools = (this.provider as ReturnType<typeof createOpenAI>).tools
      const result = await aiGenerateText({
        model: this.registry.languageModel(this.model),
        toolChoice: "required",
        tools: { web_search: tools.webSearch() },
        messages: [{ role: "user", content: [{ type: "text", text: query }] }],
        maxOutputTokens,
        maxRetries,
      })
      return {
        text: result.text,
        tokens: parseConsumedTokens(this.model, this.vendor.name, result.usage),
      }
    } else if (this.vendor.name === "anthropic") {
      if (this.model.includes("haiku")) {
        throw new NotSupportedError(
          "The web search tool is not supported for Haiku models due to their limited context window. Please use a non-Haiku model for web search functionality."
        )
      }

      const tools = (this.provider as ReturnType<typeof createAnthropic>).tools
      const result = await aiGenerateText({
        model: this.registry.languageModel(this.model),
        toolChoice: "required",
        tools: { web_search: tools.webSearch_20260209({}) },
        messages: [{ role: "user", content: [{ type: "text", text: query }] }],
        maxOutputTokens,
        maxRetries,
      })
      return {
        text: result.text,
        tokens: parseConsumedTokens(this.model, this.vendor.name, result.usage),
      }
    } else if (this.vendor.name === "google") {
      const tools = (this.provider as ReturnType<typeof createGoogleGenerativeAI>).tools
      const result = await aiGenerateText({
        model: this.registry.languageModel(this.model),
        toolChoice: "required",
        tools: { web_search: tools.googleSearch({}) },
        messages: [{ role: "user", content: [{ type: "text", text: query }] }],
        maxOutputTokens,
        maxRetries,
      })
      return {
        text: result.text,
        tokens: parseConsumedTokens(this.model, this.vendor.name, result.usage),
      }
    } else {
      throw new InvalidAiConfigError(`The configured AI vendor "${this.vendor.name}" does not support web search tool.`)
    }
  }

  async buildContext(messages: DomainMessageWithoutId[]): Promise<ModelMessage[]> {
    const contextMessages: ModelMessage[] = []
    const isAnthropic = this.vendor.name === "anthropic"
    const providerOptions = undefined
    for (const message of messages) {
      if (isDomainUserMessage(message)) {
        const content: UserModelMessage["content"] = []
        for (const c of message.content) {
          if (c.type === "text" || c.type === "meta") {
            content.push({ type: "text", text: c.text })
          } else if (c.type === "image") {
            content.push({
              type: "image",
              image: c.image,
              mediaType: c.mediaType,
            })
          } else if (c.type === "file") {
            content.push({
              type: "file",
              data: c.data,
              mediaType: c.mediaType,
            })
          } else if (c.type === "text-file") {
            content.push({
              type: "text",
              text: c.data,
            })
          } else if (c.type === "file-ref") {
            // ignore
          } else {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            throw new ImplementationError(`Unsupported media type: ${(c as any).type}`)
          }
        }
        contextMessages.push({ role: "user", content, providerOptions })
      } else if (isDomainSystemMessage(message)) {
        contextMessages.push({ role: "system", content: message.content, providerOptions })
      } else if (isDomainAssistantMessage(message)) {
        const content: AssistantModelMessage["content"] = []
        for (const c of message.content) {
          if (c.type === "text") {
            content.push({ type: "text", text: c.text })
          } else if (c.type === "tool-call") {
            content.push({
              type: "tool-call",
              toolCallId: c.toolCallId,
              toolName: c.toolName,
              input: c.input,
            })
          } else if (c.type === "proceeded-file") {
            // ignore
          } else {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            throw new ImplementationError(`Unsupported assistant content type: ${(c as any).type}`)
          }
        }
        contextMessages.push({ role: "assistant", content, providerOptions })
      } else if (isDomainToolMessage(message)) {
        const content: ToolModelMessage["content"] = []
        for (const c of message.content) {
          if (c.type === "tool-result") {
            if (c.output.type === "image") {
              const imageContent = c.output
              content.push({
                type: "tool-result",
                toolCallId: c.toolCallId,
                toolName: c.toolName,
                output: {
                  type: "content",
                  value: [
                    {
                      type: "image-data",
                      data: imageContent.image,
                      mediaType: imageContent.mediaType,
                    },
                  ],
                },
              })
            } else if (c.output.type === "file") {
              const fileContent = c.output
              content.push({
                type: "tool-result",
                toolCallId: c.toolCallId,
                toolName: c.toolName,
                output: {
                  type: "content",
                  value: [
                    {
                      type: "file-data",
                      data: fileContent.data,
                      mediaType: fileContent.mediaType,
                    },
                  ],
                },
              })
            } else if (c.output.type === "file-ref") {
              // ignore
            } else {
              content.push({
                type: "tool-result",
                toolCallId: c.toolCallId,
                toolName: c.toolName,
                output: c.output,
              })
            }
          } else if (c.type === "proceeded-file") {
            // ignore
          } else {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            throw new ImplementationError(`Unsupported tool content type: ${(c as any).type}`)
          }
        }
        contextMessages.push({ role: "tool", content, providerOptions })
      } else {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        throw new ImplementationError(`Unsupported message role: ${(message as any).role}`)
      }
    }

    // NOTE: Put a breakpoint after a tool message to enable caching of the past messages.
    const lastMessage = contextMessages[contextMessages.length - 1]
    if (lastMessage && isAnthropic) {
      lastMessage.providerOptions = { anthropic: { cacheControl: { type: "ephemeral" } } }
    }

    return contextMessages
  }
}
