import z from "zod"

import { ChatSortByList, MessageSortByList } from "@wr/db"
import { SortDirectionList } from "@wr/shared"

import { getWebAppDiContainer } from "../container"
import { ChatService } from "../services/chatType"
import { privateProcedure } from "../trpc"

export const chatGetMessages = privateProcedure
  .input(
    z.object({
      id: z.string().min(1).max(64),
      // Ths name must be `cursor` for getNextPageParam to work,
      // but it can be any name as long as it's consistent between here and the service.
      cursor: z.number().min(0).optional(),
      sortBy: z.enum(MessageSortByList).optional(),
      sortDirection: z.enum(SortDirectionList).optional(),
    })
  )
  .query(async ({ input }) => {
    const service = getWebAppDiContainer().resolve<ChatService>("ChatService")
    const { id, cursor, ...rest } = input
    return await service.getMessages({ id, page: cursor, ...rest })
  })

export const chatGetList = privateProcedure
  .input(
    z.object({
      cursor: z.number().min(0).optional(),
      sortBy: z.enum(ChatSortByList).optional(),
      sortDirection: z.enum(SortDirectionList).optional(),
    })
  )
  .query(async ({ input }) => {
    const service = getWebAppDiContainer().resolve<ChatService>("ChatService")
    const { cursor, ...rest } = input
    return await service.getList({ page: cursor, ...rest })
  })

export const chatCreate = privateProcedure.mutation(async () => {
  const service = getWebAppDiContainer().resolve<ChatService>("ChatService")
  return await service.create({})
})

export const chatDelete = privateProcedure.input(z.object({ id: z.string().min(1).max(64) })).mutation(async ({ input }) => {
  const service = getWebAppDiContainer().resolve<ChatService>("ChatService")
  await service.delete(input)
})
