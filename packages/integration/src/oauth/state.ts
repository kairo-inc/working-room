import jwt from "jsonwebtoken"

import { OAuthStateError } from "@wr/shared"

import { OAuth2State } from "./types"

const STATE_EXPIRES_IN = "10m"

export const signOAuthState = (data: OAuth2State, secret: string): string => {
  return jwt.sign(data, secret, { expiresIn: STATE_EXPIRES_IN })
}

export const verifyOAuthState = (state: string, secret: string): OAuth2State => {
  let decoded: jwt.JwtPayload | string
  try {
    decoded = jwt.verify(state, secret)
  } catch {
    throw new OAuthStateError("Invalid or expired OAuth state.")
  }
  if (typeof decoded === "string") {
    throw new OAuthStateError("Invalid OAuth state payload.")
  }
  const { userId, provider, codeChallenge, nonce } = decoded
  if (!userId || !provider || !codeChallenge || !nonce) {
    throw new OAuthStateError("Invalid OAuth state payload.")
  }
  return { userId, provider, codeChallenge, nonce }
}
