import z from "zod"

import { getWebAppDiContainer } from "../container"
import { AccessGroupService } from "../services/accessGroupType"
import { privateProcedure } from "../trpc"

export const accessGroupCreate = privateProcedure
  .input(
    z.object({
      name: z.string().min(1).max(255),
      description: z.string().max(1024).optional(),
      resourceId: z.string().min(1).max(64),
      write: z.boolean(),
      read: z.boolean(),
    })
  )
  .mutation(async ({ input }) => {
    const service = getWebAppDiContainer().resolve<AccessGroupService>("AccessGroupService")
    return await service.create(input)
  })

export const accessGroupEdit = privateProcedure
  .input(
    z.object({
      id: z.string().min(1).max(64),
      name: z.string().min(1).max(255).optional(),
      description: z.string().max(1024).optional().nullable(),
      write: z.boolean().optional(),
      read: z.boolean().optional(),
      resourceIdsToAdd: z.array(z.string().min(1).max(64)).optional(),
      resourceIdsToRemove: z.array(z.string().min(1).max(64)).optional(),
      userIdsToAdd: z.array(z.string().min(1).max(64)).optional(),
      userIdsToRemove: z.array(z.string().min(1).max(64)).optional(),
    })
  )
  .mutation(async ({ input }) => {
    const service = getWebAppDiContainer().resolve<AccessGroupService>("AccessGroupService")
    return await service.edit(input)
  })

export const accessGroupDelete = privateProcedure
  .input(
    z.object({
      id: z.string().min(1).max(64),
    })
  )
  .mutation(async ({ input }) => {
    const service = getWebAppDiContainer().resolve<AccessGroupService>("AccessGroupService")
    return await service.delete(input)
  })
