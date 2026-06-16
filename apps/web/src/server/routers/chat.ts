import z from "zod"

import { MessageSortByList } from "@wr/db"
import { SortDirectionList } from "@wr/shared"

import { getWebAppDiContainer } from "../container"
import { ChatService } from "../services/chatType"
import { privateProcedure } from "../trpc"

export const chatGetMessages = privateProcedure
  .input(
    z.object({
      id: z.string(),
      // Ths name must be `cursor` for getNextPageParam to work,
      // but it can be any name as long as it's consistent between here and the service.
      cursor: z.number().optional(),
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
      cursor: z.number().optional(),
      sortBy: z.enum(["updatedAt", "createdAt"]).optional(),
      sortDirection: z.enum(SortDirectionList).optional(),
    })
  )
  .query(async ({ input }) => {
    const service = getWebAppDiContainer().resolve<ChatService>("ChatService")
    const { cursor, ...rest } = input
    return await service.getList({ page: cursor, ...rest })
  })

export const chatCreate = privateProcedure.input(z.object({})).mutation(async ({ input }) => {
  const service = getWebAppDiContainer().resolve<ChatService>("ChatService")
  return await service.create(input)
})

export const chatDelete = privateProcedure.input(z.object({ id: z.string() })).mutation(async ({ input }) => {
  const service = getWebAppDiContainer().resolve<ChatService>("ChatService")
  await service.delete(input)
})
