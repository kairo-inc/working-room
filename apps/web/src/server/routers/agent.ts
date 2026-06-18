import z from "zod"

import { AiModelTierList } from "@wr/shared"

import { getWebAppDiContainer } from "../container"
import { AgentService } from "../services/agentType"
import { privateProcedure } from "../trpc"

export const agentCreate = privateProcedure
  .input(
    z.object({
      name: z.string(),
      description: z.string().optional(),
      descriptionForAgent: z.string(),
      tier: z.enum(AiModelTierList),
      prompt: z.string(),
      workingFolderId: z.string().optional(),
    })
  )
  .mutation(async ({ input }) => {
    const service = getWebAppDiContainer().resolve<AgentService>("AgentService")
    return await service.create(input)
  })

export const agentEdit = privateProcedure
  .input(
    z.object({
      id: z.string(),
      name: z.string().optional(),
      description: z.string().optional().nullable(),
      descriptionForAgent: z.string().optional(),
      tier: z.enum(AiModelTierList).optional(),
      prompt: z.string().optional(),
      workingFolderId: z.string().optional(),
    })
  )
  .mutation(async ({ input }) => {
    const service = getWebAppDiContainer().resolve<AgentService>("AgentService")
    await service.edit(input)
  })
