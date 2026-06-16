import { DomainAgentInteraction, DomainMessage, DomainPendingApproval } from "@wr/shared"

// Intentionally not extending Error — this is a control-flow signal, not an error.
// Thrown inside agentLoop to unwind the call stack when a tool requires user approval,
// then caught in runInternal to transition the engine into approval_required status.
export class PendingApprovalSignal {
  constructor() {}
}

export type AgentContext = {
  agentId: string
  agentName: string
  parentAgentId?: string
  depth: number
  messages: DomainMessage[]
}

export type ChatState = {
  chatId: string
  interactions: DomainAgentInteraction[]
  conversationHistory: DomainMessage[]
  pendingApproval?: DomainPendingApproval
}
