import { initTRPC } from "@trpc/server"
import * as trpcNext from "@trpc/server/adapters/next"
import { getServerSession } from "next-auth"
import superjson from "superjson"

import { AuthenticationError, BaseError } from "@wr/shared"
import { runWithPrivateContext, runWithPublicContext } from "@wr/shared-node"

import { nextAuthOptions } from "../server/auth"

// Server side File polyfill to support file upload in tRPC procedures using undici's File implementation.
if (typeof window === "undefined") {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const undici = require("undici")
  globalThis.File = undici.File
}

// Define trpc context
export async function createContext(ctx: trpcNext.CreateNextContextOptions) {
  const { req, res } = ctx
  const session = await getServerSession(req, res, nextAuthOptions)

  return {
    req,
    res,
    session,
  }
}
export type Context = Awaited<typeof createContext>

// Define trpc instance
const t = initTRPC.context<Context>().create({
  transformer: superjson,
  errorFormatter({ error, shape }) {
    if (error.cause instanceof BaseError) {
      const { name, errorCode, statusCode, message } = error.cause
      console.error(`Caught an error: [${name}](${errorCode}) - ${message}`)
      return {
        ...shape,
        data: {
          name,
          errorCode,
          httpStatus: statusCode,
        },
      }
    } else {
      console.warn(`Caught an unexpected error: [${error.name}](${error.cause?.name}) - ${error.message}`)
      return {
        ...shape,
      }
    }
  },
})

// middlewares
const publicMiddleware = t.middleware(({ next }) => {
  return runWithPublicContext({}, () => next())
})

const authMiddleware = t.middleware(({ next, ctx }) => {
  if (!ctx.session) {
    // TODO: Redirect to login page.
    // The redirection is implemented in the client side trpc error handler.
    throw new AuthenticationError("You are not logged in.")
  }
  const session = ctx.session
  const idToken = session.idToken
  return runWithPrivateContext({ idToken }, () => next({ ctx: { session } }))
})

// exports base router and procedure helpers
export const router = t.router
export const publicProcedure = t.procedure.use(publicMiddleware)
export const privateProcedure = t.procedure.use(authMiddleware)
