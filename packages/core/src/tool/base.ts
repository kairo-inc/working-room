import z from "zod"

import type { AiModelTier, DomainMessageContentToolCall, DomainToolMessage, DomainToolType } from "@wr/shared"
import { randomId } from "@wr/shared-node"

import { AgentContext, ChatState } from "../types/chat"
import { ChatEngineConfig, ConsumedToken } from "../types/engine"

export type ToolRunArgs = {
  toolCall: DomainMessageContentToolCall
  chatState: ChatState
  ctx: AgentContext
  config: ChatEngineConfig
}

export type ToolRunResult = {
  message: DomainToolMessage
  tokens?: ConsumedToken
}

export type ToolIncomingChange =
  | {
      files?: {
        path: string
        mimeType: string
        descId: string
      }[]
      change?: string
    }
  | undefined

type ToolRunOptions = {}

export abstract class Tool {
  abstract name: string
  abstract description: string
  abstract needApproval?: boolean
  abstract inputSchema: z.ZodType
  abstract toolType: DomainToolType
  protected defaultTier?: AiModelTier

  abstract run(args: ToolRunArgs, options?: ToolRunOptions): Promise<ToolRunResult>

  public async getChangeDescription(_: DomainMessageContentToolCall): Promise<ToolIncomingChange> {
    return
  }

  public async getBaseState(_: DomainMessageContentToolCall): Promise<unknown> {
    return
  }

  protected buildError(toolCall: DomainMessageContentToolCall, message: string): DomainToolMessage {
    return {
      id: randomId(),
      role: "tool",
      content: [
        {
          type: "tool-result",
          toolCallId: toolCall.toolCallId,
          toolName: toolCall.toolName,
          output: { type: "error-text", value: message },
        },
      ],
    }
  }
}
