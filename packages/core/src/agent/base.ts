import { inject, injectable } from "tsyringe"

import {
  AiModelTier,
  type AiVendorConfigs,
  AiWorkingFolder,
  type DomainAssistantMessage,
  DomainMessageWithoutId,
  type DomainToolDef,
  InvalidAiConfigError,
} from "@wr/shared"
import { randomId } from "@wr/shared-node"

import { Model } from "../model"
import { AgentContext, ChatState } from "../types/chat"
import { ChatEngineConfig, ChatEngineOnChunkCallback, ConsumedToken } from "../types/engine"

export type AgentRunArgs = {
  chatState: ChatState
  ctx: AgentContext
  tools: Record<string, DomainToolDef>
  // Same in all agents in the same chat, but can be different across chats.
  config: ChatEngineConfig
}

export type AgentRunOptions = {
  onChunk?: ChatEngineOnChunkCallback
}

export type AgentProps = {
  name: string
  description: string
  isUserFacing?: boolean
  defaultTier: AiModelTier
  prompt: string
  workingFolder?: AiWorkingFolder
}

export type AgentRunResult = {
  message: DomainAssistantMessage
  tokens?: ConsumedToken
}

@injectable()
export class Agent {
  public name: string
  public description: string
  public isUserFacing?: boolean
  public defaultTier: AiModelTier
  public prompt: string
  public workingFolder?: AiWorkingFolder

  constructor(
    @inject("AiVendorConfigs") private aiVendorConfigs: AiVendorConfigs,
    args: AgentProps
  ) {
    this.name = args.name
    this.description = args.description
    this.isUserFacing = args.isUserFacing
    this.defaultTier = args.defaultTier
    this.prompt = args.prompt
    this.workingFolder = args.workingFolder
  }

  async run(args: AgentRunArgs, options?: AgentRunOptions): Promise<AgentRunResult> {
    if (!this.aiVendorConfigs) {
      throw new InvalidAiConfigError(
        "Agent is not properly configured with AI vendor configs. Please ensure the agent is registered in the AgentRegistry which should provide the necessary configs."
      )
    }
    const vendorConfigs = this.aiVendorConfigs
    const { ctx, tools, config: engineConfig } = args
    const { onChunk } = options || {}

    // NOTE: The working folder can also be overridden on a per-chat basis, which allows for more flexible file access management depending on the context of the chat.
    // For example, different chats can operate in different folders with different files, and the agent can adapt accordingly based on the provided working folder in the chat engine config.
    // This prompt insertion does not restrict file access instead it provides a guidance to the model about the current working folder context.
    // The actual access control is implemented in the @wr/access -> FileAccessService.
    const workingFolder = this.workingFolder ?? engineConfig.workingFolder

    // Override the model tier.
    const tierOverride = engineConfig.tierOverrides?.[this.name]
    const ai = new Model({ modelTier: tierOverride ?? this.defaultTier, vendorConfigs })
    // The system prompt is always the first message, followed by the conversation history.
    // This ensures that the model receives the necessary context and instructions before processing the conversation.
    const messages: DomainMessageWithoutId[] = [{ role: "system" as const, content: this.prompt }]

    if (workingFolder) {
      // Add system prompt about the working folder to provide the model with context about the available files,
      // which can be useful for tools that need file access.
      messages.push({
        role: "system" as const,
        content: `You are working in a virtual file system with a current working folder, which ID is ${workingFolder.id} and name is ${workingFolder.name}.
${workingFolder.parent ? `The parent folder ID is ${workingFolder.parent.id} and name is ${workingFolder.parent.name}.` : "This folder is the root directory."}
This folder has the following structure:\n${workingFolder.items
          .map((item) => `- Name: ${item.name}, ID: ${item.id}, MimeType: ${item.mimeType}`)
          .join("\n")}\nYou can use the tools to access these files if needed.`,
      })
    }

    // Add the conversation history to the messages.
    messages.push(...ctx.messages)

    if (onChunk) {
      const stream = await ai.streamText({ messages, tools })
      const content: DomainAssistantMessage["content"] = []
      let currentText = ""
      let textLength = 0
      let isFirstTextChunk = true

      // Signal start of stream
      onChunk("", { streamStart: true, streamEnd: false, isFirstTextChunk: false, textLength })

      for await (const part of stream.fullStream) {
        if (part.type === "text-delta") {
          currentText += part.text
          textLength += part.text.length
          onChunk(part.text, { streamStart: false, streamEnd: false, isFirstTextChunk, textLength })
          isFirstTextChunk = false
        } else if (part.type === "tool-call") {
          if (currentText) {
            content.push({ type: "text", text: currentText })
            currentText = ""
          }
          content.push({ type: "tool-call", toolCallId: part.toolCallId, toolName: part.toolName, input: part.input })
        }
      }
      onChunk("", { streamStart: false, streamEnd: true, isFirstTextChunk: false, textLength }) // Signal end of stream

      if (currentText) {
        content.push({ type: "text", text: currentText })
      }

      // `stream.usage` resolves after fullStream is fully consumed, guaranteeing token data is available.
      const tokens = ai.parseUsage(await stream.usage)
      return { tokens, message: { id: randomId(), role: "assistant", content } }
    } else {
      const { tokens, content } = await ai.generateText({ messages, tools })
      return {
        tokens,
        message: {
          id: randomId(),
          role: "assistant",
          content: content
            .map((content) => {
              if (content.type === "tool-call") {
                return {
                  type: "tool-call",
                  toolCallId: content.toolCallId,
                  toolName: content.toolName,
                  input: content.input,
                }
              } else if (content.type === "text") {
                return { type: "text", text: content.text }
              } else {
                return null
              }
            })
            .filter((c) => c !== null) as DomainAssistantMessage["content"],
        },
      }
    }
  }
}
