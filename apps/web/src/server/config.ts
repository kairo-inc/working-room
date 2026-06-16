import type { ENV } from "@wr/shared"

const env = (process.env.ENV || "local") as ENV
const nextAuthSecret = process.env.NEXTAUTH_SECRET

if (env !== "local") {
  if (!nextAuthSecret) {
    throw new Error("NEXTAUTH_SECRET is required in non-local environments")
  }
}

export const serverConfig = {
  ENV: env,
  NEXTAUTH_SECRET: nextAuthSecret ?? "default-secret",
  MULTI_TENANT: false,
}
