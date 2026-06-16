import { ChatSortBy, MessageSortBy } from "@wr/db"
import { PageArg, PageResult } from "@wr/shared"

import { AppChat, AppChatStatus } from "../../types/chat"
import { AppMessage } from "../../types/message"
import { AppStreamEvent } from "../../types/stream"

export type ChatServiceCreateArg = {}

export type ChatServiceGetStatusArg = {
  id: string
}
export type ChatServiceDeleteArg = {
  id: string
}

export type ChatServiceGetListArg = PageArg<ChatSortBy> & {}

export type ChatServiceRunSingleLoopArg = {
  id: string
  message?: string
  approvals?: {
    approvalId: string
    isApproved: boolean
  }[]
  resources?: {
    descIds?: string[]
  }
}

export type ChatServiceGetMessagesArg = PageArg<MessageSortBy> & {
  id: string
}

export abstract class ChatService {
  abstract create(args: ChatServiceCreateArg): Promise<AppChat>
  abstract delete(args: ChatServiceDeleteArg): Promise<void>
  abstract getStatus(args: ChatServiceGetStatusArg): Promise<AppChatStatus>
  abstract getList(args: ChatServiceGetListArg): Promise<PageResult<AppChat>>
  abstract getMessages(args: ChatServiceGetMessagesArg): Promise<PageResult<AppMessage>>

  // Chat loop methods.
  abstract runSingleLoop(args: ChatServiceRunSingleLoopArg): Promise<AsyncGenerator<AppStreamEvent>>
}
