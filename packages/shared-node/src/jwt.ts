import jwt from "jsonwebtoken"
import jwksClient from "jwks-rsa"

import { AuthenticationError, TokenData } from "@wr/shared"

export function decodeJwt(idToken: string): TokenData {
  const result = jwt.decode(idToken, { json: true })
  if (!result) {
    throw new AuthenticationError("JWT decode error.")
  }
  const tenantId = result["custom:tenant_id"]
  const userId = result["custom:user_id"]
  const role = result["custom:role"]
  const email = result.email
  const exp = result.exp
  const iat = result.iat
  if (!tenantId || !userId || !role || !email || !exp || !iat) {
    throw new AuthenticationError("JWT decode error.")
  }
  return {
    tenantId,
    userId,
    role: role as TokenData["role"],
    email,
    exp,
    iat,
  }
}

export async function verifyJwt(idToken: string, jwksUri: string): Promise<TokenData> {
  const client = jwksClient({ jwksUri })

  const decoded = jwt.decode(idToken, { complete: true })
  if (!decoded || typeof decoded === "string" || !decoded.header.kid) {
    throw new AuthenticationError("JWT decode error.")
  }

  const signingKey = await client.getSigningKey(decoded.header.kid)
  const result = jwt.verify(idToken, signingKey.getPublicKey()) as jwt.JwtPayload

  const tenantId = result["custom:tenant_id"]
  const userId = result["custom:user_id"]
  const role = result["custom:role"]
  const email = result.email
  const exp = result.exp
  const iat = result.iat
  if (!tenantId || !userId || !role || !email || !exp || !iat) {
    throw new AuthenticationError("JWT decode error.")
  }
  return {
    tenantId,
    userId,
    role: role as TokenData["role"],
    email,
    exp,
    iat,
  }
}

export function encodeJwt(data: Omit<TokenData, "exp" | "iat">, secret: string): string {
  return jwt.sign(
    {
      "custom:tenant_id": data.tenantId,
      "custom:user_id": data.userId,
      "custom:role": data.role,
      email: data.email,
    },
    secret,
    { expiresIn: "7d" }
  )
}
