import { describe, expect, it } from "vitest"

import { deriveCodeChallenge, generateCodeVerifier } from "./pkce"

describe("[Success] generateCodeVerifier", () => {
  it("Generates a verifier using only the unreserved character set and within RFC 7636 length bounds", () => {
    const verifier = generateCodeVerifier()
    expect(verifier.length).toBeGreaterThanOrEqual(43)
    expect(verifier.length).toBeLessThanOrEqual(128)
    expect(verifier).toMatch(/^[A-Za-z0-9\-._~]+$/)
  })

  it("Generates a different verifier on each call", () => {
    expect(generateCodeVerifier()).not.toBe(generateCodeVerifier())
  })
})

describe("[Success] deriveCodeChallenge", () => {
  it("Matches the RFC 7636 appendix B test vector", () => {
    // Test vector from RFC 7636 Appendix B.
    const verifier = "dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk"
    const expectedChallenge = "E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM"
    expect(deriveCodeChallenge(verifier)).toBe(expectedChallenge)
  })
})
