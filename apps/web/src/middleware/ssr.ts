import { GetServerSidePropsContext, GetServerSidePropsResult } from "next"
import { getServerSession } from "next-auth"

import { UserRole } from "@wr/db"
import { AuthenticationError, NotFoundError, PermissionDeniedError, isErrorEqual } from "@wr/shared"
import { runWithPrivateContext, runWithPublicContext } from "@wr/shared-node"

import { Route } from "../route"
import { nextAuthOptions } from "../server/auth"
import { getWebAppDiContainer } from "../server/container"
import { UserService } from "../server/services/userType"
import { AppUserSetting } from "../types/user"

type Props<T> = T & { setting?: AppUserSetting }
type SsrResult<T> = GetServerSidePropsResult<Props<T>>

type Function<T> = (ctx: GetServerSidePropsContext) => Promise<{ props: T } | { redirect: { destination: string; permanent: boolean } }>

type Args<T> = {
  fn?: Function<T>
  isPublicPage?: boolean // If true, the page can be accessed without authentication. Default is false.
  acceptRoles?: UserRole[] // If specified, only users with these roles can access the page. This check is performed after authentication, so it requires the user to be authenticated.
}

// NOTE: Every pages must export handleSsr and use it in getServerSideProps to ensure that
//  the authentication and user setting are properly handled.
export const handleSsr = <T>(args?: Args<T>) => {
  const { fn, isPublicPage = false, acceptRoles } = args || {}
  return async (ctx: GetServerSidePropsContext): Promise<SsrResult<T>> => {
    try {
      const session = await getServerSession(ctx.req, ctx.res, nextAuthOptions) // You can pass your auth options here if needed.
      if (isPublicPage) {
        if (session) {
          // NOTE: If the user is already authenticated, we can choose to redirect them away from the signin page or allow them to access it.
          // Here, we choose to redirect them to the home page.
          return {
            redirect: { destination: Route.home(), permanent: false },
          }
        }

        if (fn) {
          return await runWithPublicContext({}, async () => {
            return (await fn(ctx)) as SsrResult<T>
          })
        } else {
          return { props: {} as Props<T> }
        }
      } else {
        if (!session) {
          throw new AuthenticationError("Authentication required")
        }
        return await runWithPrivateContext({ idToken: session.idToken }, async () => {
          const userService = getWebAppDiContainer().resolve<UserService>("UserService")
          const setting = await userService.getMySetting()
          if (acceptRoles && !acceptRoles.includes(setting.role)) {
            return {
              redirect: { destination: "/403", permanent: false },
            }
          }

          if (fn) {
            const fnResult = await fn(ctx)
            if ("props" in fnResult) {
              return {
                props: {
                  ...fnResult.props,
                  setting,
                } satisfies Props<T>,
              }
            } else {
              return fnResult
            }
          } else {
            return { props: { setting } as Props<T> }
          }
        })
      }
    } catch (e) {
      console.error("Error in handleSsr:", e)
      if (isErrorEqual(e, NotFoundError)) {
        return { redirect: { destination: "/404", permanent: false } }
      } else if (isErrorEqual(e, AuthenticationError)) {
        if (!isPublicPage) {
          return { redirect: { destination: Route.signin(), permanent: false } }
        }
      } else if (isErrorEqual(e, PermissionDeniedError)) {
        return { redirect: { destination: "/403", permanent: false } }
      }
      return { redirect: { destination: "/500", permanent: false } }
    }
  }
}
