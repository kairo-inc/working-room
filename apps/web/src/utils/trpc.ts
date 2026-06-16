import { httpBatchLink, httpLink, httpSubscriptionLink, isNonJsonSerializable, splitLink } from "@trpc/client"
import { createTRPCNext } from "@trpc/next"
import superjson from "superjson"

import type { AppRouter } from "../server/routers/_app"

function getBaseUrl() {
  if (typeof window !== "undefined")
    // browser should use relative path
    return ""
  return `http://localhost:${process.env.PORT ?? 3000}`
}

export const trpc = createTRPCNext<AppRouter>({
  config() {
    return {
      links: [
        splitLink({
          condition: (op) => op.type === "subscription",
          true: httpSubscriptionLink({
            url: `${getBaseUrl()}/api/trpc`,
            transformer: superjson,
          }),
          false: splitLink({
            condition: (op) => isNonJsonSerializable(op.input),
            true: httpLink({
              url: `${getBaseUrl()}/api/trpc`,
              transformer: superjson,
            }),
            false: httpBatchLink({
              url: `${getBaseUrl()}/api/trpc`,
              transformer: superjson,
            }),
          }),
        }),
      ],
    }
  },
  /**
   * @see https://trpc.io/docs/v11/ssr
   **/
  ssr: false,
  transformer: superjson,
})
