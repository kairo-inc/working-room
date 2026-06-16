import { AppChatNeedApproval } from "./chat"

export type AppStreamEventTextChunk = {
  type: "text"
  text: string
}

export type AppStreamEventChatRequestApproval = {
  type: "chat-request-approval"
  needApprovals: AppChatNeedApproval[]
}

export type AppStreamEventSubAgentStart = {
  type: "sub-agent-start"
  agentName: string
}

export type AppStreamEventSubAgentEnd = {
  type: "sub-agent-end"
  agentName: string
}

export type AppStreamEventToolCallStart = {
  type: "tool-call-start"
  toolName: string
}

export type AppStreamEventToolCallEnd = {
  type: "tool-call-end"
  toolName: string
}

export type AppStreamEventToolCallFailed = {
  type: "tool-call-failed"
  toolName: string
  error: string
}

export type AppStreamEventError = {
  type: "error"
  message: string
  errorCode: string
}

export type AppStreamEvent =
  | AppStreamEventTextChunk
  | AppStreamEventSubAgentStart
  | AppStreamEventSubAgentEnd
  | AppStreamEventToolCallStart
  | AppStreamEventToolCallEnd
  | AppStreamEventToolCallFailed
  | AppStreamEventChatRequestApproval
  | AppStreamEventError
