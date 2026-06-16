import { z } from "zod"

import { getWebAppDiContainer } from "../container"
import { UserService } from "../services/userType"
import { privateProcedure } from "../trpc"

export const userEdit = privateProcedure.input(z.object({ name: z.string().optional() })).mutation(async ({ input }) => {
  const service = getWebAppDiContainer().resolve<UserService>("UserService")
  await service.editMySelf({ name: input.name })
})
