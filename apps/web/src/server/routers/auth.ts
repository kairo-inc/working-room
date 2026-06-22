import Zod from "zod"

import { getWebAppDiContainer } from "../../server/container"
import { AuthService } from "../../server/services/authType"
import { privateProcedure, publicProcedure } from "../../server/trpc"

export const authSignup = publicProcedure
  .input(
    Zod.object({
      tenantName: Zod.string().min(1).max(128).optional(),
      email: Zod.string().min(1).max(128),
      token: Zod.string().min(1).max(8192),
    })
  )
  .mutation(async ({ input }) => {
    const service = getWebAppDiContainer().resolve<AuthService>("AuthService")
    return await service.signup({ ...input })
  })

export const authInitiatePassword = publicProcedure
  .input(
    Zod.object({
      email: Zod.string().min(1).max(128),
      newPassword: Zod.string().min(8).max(128),
      sessionCode: Zod.string().min(1).max(8192),
    })
  )
  .mutation(async ({ input }) => {
    const service = getWebAppDiContainer().resolve<AuthService>("AuthService")
    await service.initiatePassword({ ...input })
  })

export const authSignout = privateProcedure.mutation(async () => {
  const service = getWebAppDiContainer().resolve<AuthService>("AuthService")
  await service.signout()
})
