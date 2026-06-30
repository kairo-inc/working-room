import { DomainChat, DomainChatStatus, DomainNeedApproval } from "@wr/shared"

import { AppChat, AppChatNeedApproval, AppChatStatus } from "../types/chat"
import { mapUserMessageDomainToApp } from "./message"

export const mapChatNeedApprovalDomainToApp = (domain: DomainNeedApproval): AppChatNeedApproval => {
  return {
    approvalId: domain.approvalId,
    toolName: domain.toolCall.toolName,
    toolType: domain.toolType,
    change: domain.change,
  }
}

export const mapChatDomainToApp = (domain: DomainChat): AppChat => {
  return {
    id: domain.id,
    updatedAt: domain.updatedAt,
    requireApproval: domain.requireApproval,
    lastUserMessage: domain.lastUserMessage ? mapUserMessageDomainToApp(domain.lastUserMessage) : undefined,
    workingFolder: domain.workingFolder ? { id: domain.workingFolder.id, name: domain.workingFolder.name } : undefined,
  }
}

export const mapChatStatusDomainToApp = (domain: DomainChatStatus): AppChatStatus => {
  return {
    id: domain.id,
    requireApproval: domain.requireApproval,
    needApprovals: domain.pendingApproval ? domain.pendingApproval.needApprovals.map(mapChatNeedApprovalDomainToApp) : [],
    workingFolder: domain.workingFolder ? { id: domain.workingFolder.id, name: domain.workingFolder.name } : undefined,
  }
}
