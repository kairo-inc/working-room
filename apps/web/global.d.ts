import "next-auth"
import "next-auth/jwt"

declare global {
  declare module "*.css"
}

declare module "next-auth" {
  interface Session {
    idToken: string
  }

  interface DefaultUser {
    // We don't use the `id` field of NextAuth, but it is required to be defined in the type declaration.
    id?: string
  }

  interface User {
    idToken: string
  }

  interface Account {
    idToken: string
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    idToken?: string
  }
}
