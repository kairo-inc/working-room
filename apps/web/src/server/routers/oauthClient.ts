import z from "zod"

import { getWebAppDiContainer } from "../container"
import { OauthClientService } from "../services/oauthClientType"
import { privateProcedure } from "../trpc"

export const oauthClientDisconnect = privateProcedure
  .input(z.object({ id: z.string().min(1).max(64), provider: z.enum(["slack"]) }))
  .mutation(async ({ input }) => {
    const service = getWebAppDiContainer().resolve<OauthClientService>("OauthClientService")
    await service.disconnect({ id: input.id, provider: input.provider })
  })
