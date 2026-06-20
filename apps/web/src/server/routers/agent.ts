import z from "zod"

import { AiModelTierList } from "@wr/shared"

import { getWebAppDiContainer } from "../container"
import { AgentService } from "../services/agentType"
import { privateProcedure } from "../trpc"

export const agentCreate = privateProcedure
  .input(
    z.object({
      name: z.string().min(1).max(128),
      description: z.string().max(1024).optional(),
      descriptionForAgent: z.string().min(1).max(2048),
      tier: z.enum(AiModelTierList),
      prompt: z.string().min(1).max(8192),
      workingFolderId: z.string().min(1).max(64).optional(),
    })
  )
  .mutation(async ({ input }) => {
    const service = getWebAppDiContainer().resolve<AgentService>("AgentService")
    return await service.create(input)
  })

export const agentEdit = privateProcedure
  .input(
    z.object({
      id: z.string().min(1).max(64),
      name: z.string().min(1).max(128).optional(),
      description: z.string().max(1024).optional().nullable(),
      descriptionForAgent: z.string().min(1).max(2048).optional(),
      tier: z.enum(AiModelTierList).optional(),
      prompt: z.string().min(1).max(8192).optional(),
      workingFolderId: z.string().min(1).max(64).optional().nullish(),
    })
  )
  .mutation(async ({ input }) => {
    const service = getWebAppDiContainer().resolve<AgentService>("AgentService")
    await service.edit(input)
  })

export const agentDelete = privateProcedure.input(z.object({ id: z.string().min(1).max(64) })).mutation(async ({ input }) => {
  const service = getWebAppDiContainer().resolve<AgentService>("AgentService")
  await service.delete({ id: input.id })
})
