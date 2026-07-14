import { createHash, randomBytes } from "node:crypto"

// RFC 7636 recommends at least 32 bytes of entropy for the code verifier.
const CODE_VERIFIER_BYTES = 32

export const generateCodeVerifier = (): string => {
  return randomBytes(CODE_VERIFIER_BYTES).toString("base64url")
}

export const deriveCodeChallenge = (verifier: string): string => {
  return createHash("sha256").update(verifier).digest("base64url")
}
