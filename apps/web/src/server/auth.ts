import { NextAuthOptions } from "next-auth"
import Credentials from "next-auth/providers/credentials"

import { AuthenticationError, isErrorEqual } from "@wr/shared"

import { serverConfig } from "../server/config"
import { getWebAppDiContainer } from "../server/container"
import { AuthService } from "../server/services/authType"

export const nextAuthOptions: NextAuthOptions = {
  secret: serverConfig.NEXTAUTH_SECRET,
  session: {
    strategy: "jwt",
    // 30 days(same as refresh token's lifespan)
    maxAge: 30 * 24 * 60 * 60,
  },
  providers: [
    Credentials({
      name: "Credentials",
      credentials: {
        email: { type: "email" },
        password: { type: "password" },
        session: { label: "session", type: "text" },
      },
      authorize: async (credentials) => {
        // Check credentials
        if (!credentials || !credentials?.email || !credentials?.password) {
          console.error("Email or password is not provided")
          // NOTE: Nextauth throws 401 if this function returns null.
          return null
        }
        const { email, password, session } = credentials
        // Check parameters
        if (email.length > 100 || password.length > 100) {
          console.error("Email or password is too long")
          return null
        }

        const authService = getWebAppDiContainer().resolve<AuthService>("AuthService")
        if (session && session !== "undefined") {
          // NOTE: session is needed for users who are signing in with initial password, which is issued when tenant is created.
          // After user sets new password, session is not needed anymore and will not be sent from client.
          const { idToken } = await authService.initiatePassword({
            email,
            newPassword: password,
            sessionCode: session,
          })
          // NOTE: JWT contains everything needed for identifying user and authorizing, so we don't need to return user info here.
          return { idToken }
        } else {
          // Normal signin flow.
          const { idToken } = await authService.signinWithEmail({
            email,
            password,
          })
          return { idToken }
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user?.idToken) {
        token.idToken = user.idToken
        return token
      }

      if (token.idToken) {
        const authService = getWebAppDiContainer().resolve<AuthService>("AuthService")
        try {
          await authService.verifyToken({ idToken: token.idToken as string })
          return token
        } catch (e) {
          if (!isErrorEqual(e, AuthenticationError)) throw e
          try {
            const { idToken } = await authService.refreshToken({ idToken: token.idToken as string })
            token.idToken = idToken
            return token
          } catch {
            token.idToken = undefined
            throw new AuthenticationError("Session expired. Please sign in again.")
          }
        }
      }
      return token
    },
    session({ token, session }) {
      if (token && token.idToken) {
        session.idToken = token.idToken
      }
      return session
    },
  },
}
