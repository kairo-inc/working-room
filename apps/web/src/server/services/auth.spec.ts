import { PrismaClient } from "@prisma/client"
import { afterEach, beforeEach, describe, expect, it } from "vitest"

import { CoreConfig } from "@wr/core"
import { AuthenticationError, PasswordInitializationRequired } from "@wr/shared"
import { decodeJwt, runWithDiContainer } from "@wr/shared-node"
import { fixtureFactory } from "@wr/testing"

import { getWebAppDiContainer } from "../container"
import { AuthSource } from "../sources/authType"
import { LocalAuthSourceImpl } from "../sources/localAuth"
import { AuthService } from "./authType"

describe("[Success] AuthService", () => {
  let testContainer: ReturnType<typeof getWebAppDiContainer>
  let prismaClient: PrismaClient
  let config: CoreConfig

  beforeEach(async () => {
    testContainer = getWebAppDiContainer().createChildContainer()
    config = fixtureFactory.createTestConfigWithTmpFolder()
    prismaClient = await fixtureFactory.createDbClient()
    testContainer.registerInstance<CoreConfig>("CoreConfig", config)
    testContainer.registerInstance<PrismaClient>("PrismaClient", prismaClient)
    testContainer.register<AuthSource>("AuthSource", LocalAuthSourceImpl)
  })

  afterEach(async () => {
    await fixtureFactory.resetDatabase()
    await fixtureFactory.removeTestFolder(config)
  })

  it("Session data check for signup", async () => {
    const testEmail = `test-${Date.now()}@workingroom.io`
    await runWithDiContainer(testContainer, async () => {
      const authService = testContainer.resolve<AuthService>("AuthService")
      const { localAuthProps } = await authService.signup({
        email: testEmail,
        token: "",
      })
      expect(localAuthProps).not.toBeUndefined()

      // Initial password
      const initialResult = authService.signinWithEmail({
        email: testEmail,
        password: localAuthProps!.initialPassword,
      })
      await expect(initialResult).rejects.toThrow(PasswordInitializationRequired)
      const session = await initialResult.catch((e) => {
        const data = JSON.parse(e.message)
        return data["data"]
      })

      // After password initialization, signin should succeed.
      const { idToken } = await authService.initiatePassword({
        email: testEmail,
        newPassword: "new-password",
        sessionCode: session,
      })

      const { email: decodedEmail } = decodeJwt(idToken)
      expect(decodedEmail).toBe(testEmail)

      // Expect successful signin with new password.
      await authService.signinWithEmail({
        email: testEmail,
        password: "new-password",
      })

      const signinFails = authService.signinWithEmail({
        email: testEmail,
        password: "wrong-password",
      })
      await expect(signinFails).rejects.toThrow(AuthenticationError)
    })
  })
})
