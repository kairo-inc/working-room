import z from "zod"

import { getWebAppDiContainer } from "../container"
import { AccessGroupService } from "../services/accessGroupType"
import { privateProcedure } from "../trpc"

export const accessGroupCreate = privateProcedure
  .input(
    z.object({
      name: z.string(),
      description: z.string().optional(),
      resourceId: z.string(),
      write: z.boolean(),
      read: z.boolean(),
    })
  )
  .mutation(async ({ input }) => {
    const service = getWebAppDiContainer().resolve<AccessGroupService>("AccessGroupService")
    return await service.create(input)
  })

export const accessGroupDelete = privateProcedure
  .input(
    z.object({
      id: z.string(),
    })
  )
  .mutation(async ({ input }) => {
    const service = getWebAppDiContainer().resolve<AccessGroupService>("AccessGroupService")
    return await service.delete(input)
  })
