import type { ENV } from "@wr/shared"

const env = (process.env.ENV || "local") as ENV
const nextAuthSecret = process.env.NEXTAUTH_SECRET
const oauthStateSecret = process.env.OAUTH_STATE_SECRET

if (env !== "local") {
  if (!nextAuthSecret) {
    throw new Error("NEXTAUTH_SECRET is required in non-local environments")
  }
  if (!oauthStateSecret) {
    throw new Error("OAUTH_STATE_SECRET is required in non-local environments")
  }
}

export const serverConfig = {
  ENV: env,
  NEXTAUTH_SECRET: nextAuthSecret ?? "default-secret",
  OAUTH_STATE_SECRET: oauthStateSecret ?? "default-oauth-state-secret",
  MULTI_TENANT: false,
  HOST: process.env.HOST || "http://localhost:3000",
}
