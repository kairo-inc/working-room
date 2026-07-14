import { NextApiRequest } from "next"

import { serverConfig } from "../config"

const CODE_VERIFIER_COOKIE_NAME = "wr-oauth.code_verifier"
const CODE_VERIFIER_COOKIE_MAX_AGE_SECONDS = 600

export const buildCodeVerifierCookie = (codeVerifier: string): string => {
  const attrs = ["Path=/api/oauth", "HttpOnly", "SameSite=Lax", `Max-Age=${CODE_VERIFIER_COOKIE_MAX_AGE_SECONDS}`]
  if (serverConfig.ENV !== "local") attrs.push("Secure")
  return `${CODE_VERIFIER_COOKIE_NAME}=${codeVerifier}; ${attrs.join("; ")}`
}

export const buildClearCodeVerifierCookie = (): string => {
  const attrs = ["Path=/api/oauth", "HttpOnly", "SameSite=Lax", "Max-Age=0"]
  if (serverConfig.ENV !== "local") attrs.push("Secure")
  return `${CODE_VERIFIER_COOKIE_NAME}=; ${attrs.join("; ")}`
}

export const readCodeVerifierCookie = (req: NextApiRequest): string | undefined => {
  return req.cookies[CODE_VERIFIER_COOKIE_NAME]
}
