import { Message, Prisma } from "@prisma/client"

// EntityMessage.
export class EntityMessage implements Omit<Message, "deletedAt"> {
  id: string
  createdAt: Date
  updatedAt: Date
  chatId: string
  role: Message["role"]
  content: string
  isUserFacing: boolean
  sequence: number

  static select = {
    id: true,
    createdAt: true,
    updatedAt: true,
    chatId: true,
    role: true,
    content: true,
    isUserFacing: true,
    sequence: true,
  } as const satisfies Prisma.MessageSelect
}

export const MessageSortByList = ["createdAt", "updatedAt", "sequence"] as const
export type MessageSortBy = (typeof MessageSortByList)[number]
