import { z } from "zod"

import { UserSortByList } from "@wr/db"
import { SortDirectionList } from "@wr/shared"

import { getWebAppDiContainer } from "../container"
import { UserService } from "../services/userType"
import { privateProcedure } from "../trpc"

export const userEdit = privateProcedure.input(z.object({ name: z.string().min(1).max(128).optional() })).mutation(async ({ input }) => {
  const service = getWebAppDiContainer().resolve<UserService>("UserService")
  await service.editMySelf({ name: input.name })
})

export const userGetList = privateProcedure
  .input(
    z.object({
      cursor: z.number().min(0).optional(),
      sortBy: z.enum(UserSortByList).optional(),
      sortDirection: z.enum(SortDirectionList).optional(),
      take: z.number().int().min(1).optional(),

      // Fileter query parameters
      charContains: z.string().max(128).optional(),
    })
  )
  .query(async ({ input }) => {
    const service = getWebAppDiContainer().resolve<UserService>("UserService")
    const { cursor, ...rest } = input
    return await service.getList({
      page: cursor,
      ...rest,
    })
  })
