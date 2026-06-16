import { z } from "zod"

import { userRoles } from "@wr/shared"

import { getWebAppDiContainer } from "../container"
import { TenantService } from "../services/tenantType"
import { privateProcedure } from "../trpc"

export const tenantDelete = privateProcedure.mutation(async () => {
  const service = getWebAppDiContainer().resolve<TenantService>("TenantService")
  await service.delete({})
})

export const tenantInviteUser = privateProcedure
  .input(z.object({ email: z.string() }))
  .mutation(async ({ input }: { input: { email: string } }) => {
    const service = getWebAppDiContainer().resolve<TenantService>("TenantService")
    return await service.invite({ email: input.email, role: "member" })
  })

export const tenantEdit = privateProcedure
  .input(z.object({ name: z.string() }))
  .mutation(async ({ input }: { input: { name: string } }) => {
    const service = getWebAppDiContainer().resolve<TenantService>("TenantService")
    await service.edit({ name: input.name })
  })

export const tenantDeleteUser = privateProcedure
  .input(z.object({ userId: z.string() }))
  .mutation(async ({ input }: { input: { userId: string } }) => {
    const service = getWebAppDiContainer().resolve<TenantService>("TenantService")
    await service.deleteUser({ userId: input.userId })
  })

export const tenantResetUserPassword = privateProcedure
  .input(z.object({ userId: z.string() }))
  .mutation(async ({ input }: { input: { userId: string } }) => {
    const service = getWebAppDiContainer().resolve<TenantService>("TenantService")
    return await service.resetPassword({ userId: input.userId })
  })

export const tenantChangeUserRole = privateProcedure
  .input(z.object({ userId: z.string(), newRole: z.enum(userRoles) }))
  .mutation(async ({ input }: { input: { userId: string; newRole: (typeof userRoles)[number] } }) => {
    const service = getWebAppDiContainer().resolve<TenantService>("TenantService")
    await service.changeRole({ userId: input.userId, newRole: input.newRole })
  })
