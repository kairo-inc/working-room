import { DomainMessageContentToolCall, DomainUserMessage } from "./message"

export const DomainToolTypeEnum = ["create", "edit", "delete", "read", "move"] as const
export type DomainToolType = (typeof DomainToolTypeEnum)[number]

export type DomainIncomingChange = {
  files?: {
    path: string
    mimeType: string
    descId: string
  }[]
  change?: string
}

export type DomainNeedApproval = {
  approvalId: string
  toolCall: DomainMessageContentToolCall // The tool call awaiting approval

  toolType: DomainToolType
  change?: DomainIncomingChange // A human-readable description of the change that requires approval, if applicable
}

export type DomainNeedApprovalWithStatus = DomainNeedApproval & {
  isApproved?: boolean
}

export type DomainPendingApproval = {
  needApprovals: DomainNeedApproval[]
  otherToolCalls: DomainMessageContentToolCall[] // Other tool calls from the same turn, run automatically on resume
  agentName: string
}

export type DomainAgentInteraction = {
  interactionId: string
  agentId: string
  agentName: string
  parentInteractionId?: string
  depth: number
  summary?: string
  startedAt: number
  completedAt?: number
}

export type DomainChat = {
  id: string
  updatedAt: Date
  requireApproval: boolean
  lastUserMessage?: DomainUserMessage
}

export type DomainChatStatus = {
  id: string
  requireApproval: boolean
  interactions: DomainAgentInteraction[]
  pendingApproval?: DomainPendingApproval
  workingFolder?: {
    id: string
    name: string
  }
}
