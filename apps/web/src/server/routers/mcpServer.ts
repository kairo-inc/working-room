import z from "zod"

import { getWebAppDiContainer } from "../container"
import { McpServerService } from "../services/mcpServerType"
import { privateProcedure } from "../trpc"

// The name becomes part of the Tool names exposed to the LLM, which only accept these characters.
const nameSchema = z
  .string()
  .min(1)
  .max(32)
  .regex(/^[a-zA-Z0-9_-]+$/)
const urlSchema = z
  .string()
  .max(2048)
  .url()
  .refine((v) => /^https?:\/\//.test(v))
const accessTokenSchema = z.string().min(1).max(4096)

export const mcpServerList = privateProcedure.query(async () => {
  const service = getWebAppDiContainer().resolve<McpServerService>("McpServerService")
  return await service.getList()
})

export const mcpServerCreate = privateProcedure
  .input(z.object({ name: nameSchema, url: urlSchema, accessToken: accessTokenSchema.optional() }))
  .mutation(async ({ input }) => {
    const service = getWebAppDiContainer().resolve<McpServerService>("McpServerService")
    return await service.create(input)
  })

export const mcpServerEdit = privateProcedure
  .input(
    z.object({
      id: z.string().min(1).max(64),
      name: nameSchema.optional(),
      url: urlSchema.optional(),
      accessToken: accessTokenSchema.nullish(),
      enabled: z.boolean().optional(),
    })
  )
  .mutation(async ({ input }) => {
    const service = getWebAppDiContainer().resolve<McpServerService>("McpServerService")
    return await service.edit(input)
  })

export const mcpServerDelete = privateProcedure.input(z.object({ id: z.string().min(1).max(64) })).mutation(async ({ input }) => {
  const service = getWebAppDiContainer().resolve<McpServerService>("McpServerService")
  await service.delete({ id: input.id })
})

export const mcpServerRefreshTools = privateProcedure.input(z.object({ id: z.string().min(1).max(64) })).mutation(async ({ input }) => {
  const service = getWebAppDiContainer().resolve<McpServerService>("McpServerService")
  return await service.refreshTools({ id: input.id })
})
