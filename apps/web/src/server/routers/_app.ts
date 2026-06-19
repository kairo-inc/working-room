import { router } from "../trpc"
import * as accessGroup from "./accessGroup"
import * as agent from "./agent"
import * as auth from "./auth"
import * as chat from "./chat"
import * as file from "./file"
import * as tenant from "./tenant"
import * as user from "./user"

export const appRouter = router({
  ...auth,
  ...chat,
  ...user,
  ...tenant,
  ...file,
  ...agent,
  ...accessGroup,
})

// export type definition of API
export type AppRouter = typeof appRouter
