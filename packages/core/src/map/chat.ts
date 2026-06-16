import { DomainChatStatus, DomainMessage } from "@wr/shared"

import { ChatState } from "../types"

export const buildChatStateFromDomain = (chat: DomainChatStatus, messages: DomainMessage[]): ChatState => {
  return {
    chatId: chat.id,
    conversationHistory: messages,
    interactions: chat.interactions,
    pendingApproval: chat.pendingApproval,
  }
}

export const buildChatStateToDomain = (state: ChatState): { chat: DomainChatStatus; messages: DomainMessage[] } => {
  const chat: DomainChatStatus = {
    id: state.chatId,
    interactions: state.interactions,
    pendingApproval: state.pendingApproval,
    requireApproval: state.pendingApproval ? true : false,
  }
  return {
    chat,
    messages: state.conversationHistory,
  }
}
