import { DomainToolType } from "@wr/shared"

import { AppUserMessage } from "./message"

export type AppChatIncomingChange = {
  files?: {
    path: string
    mimeType: string
    descId: string
  }[]
  change?: string
}

export type AppChatNeedApproval = {
  approvalId: string
  toolName: string
  toolType: DomainToolType
  change?: AppChatIncomingChange
}

export type AppChat = {
  id: string
  updatedAt: Date
  requireApproval: boolean
  lastUserMessage?: AppUserMessage
}

export type AppChatStatus = {
  id: string
  requireApproval: boolean
  needApprovals: AppChatNeedApproval[]
}
