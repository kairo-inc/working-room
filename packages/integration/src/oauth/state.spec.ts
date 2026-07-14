import { describe, expect, it, vi } from "vitest"

import { OAuthStateError } from "@wr/shared"

import { signOAuthState, verifyOAuthState } from "./state"
import { OAuth2State } from "./types"

const SECRET = "test-secret"
const DATA: OAuth2State = { userId: "user-1", provider: "slack", codeChallenge: "challenge", nonce: "nonce-1" }

describe("[Success] signOAuthState / verifyOAuthState", () => {
  it("Round-trips the original payload", () => {
    const state = signOAuthState(DATA, SECRET)
    expect(verifyOAuthState(state, SECRET)).toEqual(DATA)
  })
})

describe("[Failure] verifyOAuthState", () => {
  it("Throws OAuthStateError for a tampered token", () => {
    const state = signOAuthState(DATA, SECRET)
    const tampered = state.slice(0, -1) + (state.at(-1) === "a" ? "b" : "a")
    expect(() => verifyOAuthState(tampered, SECRET)).toThrow(OAuthStateError)
  })

  it("Throws OAuthStateError for an expired token", () => {
    vi.useFakeTimers()
    const state = signOAuthState(DATA, SECRET)
    vi.advanceTimersByTime(11 * 60 * 1000)
    expect(() => verifyOAuthState(state, SECRET)).toThrow(OAuthStateError)
    vi.useRealTimers()
  })

  it("Throws OAuthStateError when verified with the wrong secret", () => {
    const state = signOAuthState(DATA, SECRET)
    expect(() => verifyOAuthState(state, "wrong-secret")).toThrow(OAuthStateError)
  })
})
