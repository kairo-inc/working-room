import { Chat, Prisma } from "@prisma/client"

import { EntityFileDescriptor } from "./fileDescriptor"
import { EntityMessage } from "./message"

export class EntityChatStatus implements Omit<Chat, "deletedAt" | "workingFolderId"> {
  id: string
  createdAt: Date
  updatedAt: Date
  userId: string
  pendingApproval: string | null
  interactions: string | null
  resources: EntityFileDescriptor[]
  requireApproval: boolean
  workingFolder: {
    id: string
    name: string
  } | null

  static select = {
    id: true,
    createdAt: true,
    updatedAt: true,
    userId: true,
    pendingApproval: true,
    interactions: true,
    requireApproval: true,
    resources: { select: EntityFileDescriptor.select },
    workingFolder: {
      select: { id: true, name: true },
      where: { deletedAt: null },
    },
  } as const satisfies Prisma.ChatSelect
}

export class EntityChat implements Omit<
  Chat,
  "deletedAt" | "userId" | "pendingApproval" | "interactions" | "resources" | "workingFolderId"
> {
  id: string
  createdAt: Date
  updatedAt: Date
  messages: EntityMessage[]
  requireApproval: boolean
  workingFolder: {
    id: string
    name: string
  } | null

  static select = {
    id: true,
    createdAt: true,
    updatedAt: true,
    requireApproval: true,
    messages: { select: EntityMessage.select, take: 1, orderBy: { createdAt: "desc" }, where: { role: "user" } },
    workingFolder: {
      select: { id: true, name: true },
      where: { deletedAt: null },
    },
  } as const satisfies Prisma.ChatSelect
}

export const ChatSortByList = ["createdAt", "updatedAt"] as const
export type ChatSortBy = (typeof ChatSortByList)[number]
