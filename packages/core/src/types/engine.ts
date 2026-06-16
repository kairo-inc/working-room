import { AiModelTier, AiVendorName, AiWorkingFolder } from "@wr/shared"

import { ChatState } from "./chat"

export type ConsumedToken = {
  inputTokens: number
  outputTokens: number
  noCacheInputTokens: number
  cachedInputTokens: number
  model: string
  provider: AiVendorName
}

export type ChatEngineRunResult =
  | { status: "done"; text: string; chatState: ChatState }
  | { status: "approval_required"; chatState: ChatState }
  | { status: "aborted"; chatState: ChatState }

export type ChatEngineConfig = {
  // Override the model tier for specific tools or agents.
  // The key is the tool name or agent name, and the value is the model tier to use for that tool or agent.
  tierOverrides?: Partial<Record<string, AiModelTier>>

  // A folder that the engine assumes it as a current working directory, which can be used by tools that need file access.
  // This is optional and can be set on a per-chat basis.
  workingFolder?: AiWorkingFolder
}

export type ChatEngineOnChunkCallback = (
  chunk: string,
  options?: { streamStart?: boolean; streamEnd?: boolean; isFirstTextChunk?: boolean; textLength?: number }
) => void

export type ChatEngineHooks = {
  // Called for each streamed text chunk from the user-facing agent.
  onChunk?: ChatEngineOnChunkCallback
}
