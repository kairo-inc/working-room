import { DomainMessageContentToolCall, DomainPendingApproval } from "@wr/shared"

import type { AgentContext, ChatState } from "./chat"
import { ConsumedToken } from "./engine"

export type EventChatLoopStart = {
  type: "chat-loop-start"
  chatState: ChatState
}

export type EventChatLoopEnd = {
  type: "chat-loop-end"
  chatState: ChatState
}

export type EventChatResume = {
  type: "chat-resume"
  chatState: ChatState
  ctx: AgentContext
  decision: "approved" | "rejected"
  toolCall: DomainMessageContentToolCall
}

export type EventChatResumeFailed = {
  type: "chat-resume-failed"
  chatState: ChatState
}

export type EventChatApprovalRequired = {
  type: "chat-approval-required"
  chatState: ChatState
  ctx: AgentContext
  pendingApproval: DomainPendingApproval
}

export type EventSessionAborted = {
  type: "session-aborted"
  chatState: ChatState
  ctx: AgentContext
}

export type EventToolCallStart = {
  type: "tool-call-start"
  chatState: ChatState
  ctx: AgentContext
  toolCallId: string
  toolName: string
}

export type EventToolCallEnd = {
  type: "tool-call-end"
  chatState: ChatState
  ctx: AgentContext
  toolCallId: string
  toolName: string
}

export type EventToolCallFailed = {
  type: "tool-call-failed"
  chatState: ChatState
  ctx: AgentContext
  toolCallId: string
  toolName: string
  error: string
}

export type EventAgentStart = {
  type: "agent-start"
  chatState: ChatState
  ctx: AgentContext
  agentName: string
}
export type EventAgentEnd = {
  type: "agent-end"
  chatState: ChatState
  ctx: AgentContext
  agentName: string
}

export type EventAgentTokenConsumed = {
  type: "agent-token-consumed"
  chatState: ChatState
  ctx: AgentContext
  tokens: ConsumedToken
  agentName: string
}

export type EventToolTokenConsumed = {
  type: "tool-token-consumed"
  chatState: ChatState
  ctx: AgentContext
  tokens: ConsumedToken
  toolName: string
}

export type ChatEvent =
  | EventChatLoopStart
  | EventChatLoopEnd
  | EventChatResume
  | EventChatResumeFailed
  | EventChatApprovalRequired
  | EventSessionAborted
  | EventToolCallStart
  | EventToolCallEnd
  | EventToolCallFailed
  | EventAgentStart
  | EventAgentEnd
  | EventAgentTokenConsumed
  | EventToolTokenConsumed
