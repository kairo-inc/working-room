import Zod from "zod"

import { getWebAppDiContainer } from "../../server/container"
import { AuthService } from "../../server/services/authType"
import { publicProcedure } from "../../server/trpc"

export const authSignup = publicProcedure
  .input(
    Zod.object({
      tenantName: Zod.string().max(100).optional(),
      email: Zod.string().min(1).max(100),
      token: Zod.string().min(1).max(2000),
    })
  )
  .mutation(async ({ input }) => {
    const service = getWebAppDiContainer().resolve<AuthService>("AuthService")
    return await service.signup({ ...input })
  })

export const authInitiatePassword = publicProcedure
  .input(
    Zod.object({
      email: Zod.string().min(1).max(100),
      newPassword: Zod.string().min(8).max(100),
      sessionCode: Zod.string().min(1).max(2000),
    })
  )
  .mutation(async ({ input }) => {
    const service = getWebAppDiContainer().resolve<AuthService>("AuthService")
    await service.initiatePassword({ ...input })
  })
