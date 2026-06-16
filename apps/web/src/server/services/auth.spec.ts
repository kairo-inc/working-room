import { PrismaClient } from "@prisma/client"
import { beforeEach, describe, expect, it } from "vitest"

import { CoreConfig } from "@wr/core"
import { AuthenticationError, PasswordInitializationRequired } from "@wr/shared"
import { decodeJwt, runWithDiContainer } from "@wr/shared-node"
import { createTestConfigWithTmpFolder, createTestPrismaClient, testNotExistUserEmail } from "@wr/testing"

import { getWebAppDiContainer } from "../container"
import { AuthSource } from "../sources/authType"
import { LocalAuthSourceImpl } from "../sources/localAuth"
import { AuthService } from "./authType"

describe("[Success] AuthService", () => {
  let testContainer: ReturnType<typeof getWebAppDiContainer>

  beforeEach(async () => {
    testContainer = getWebAppDiContainer().createChildContainer()
    const config: CoreConfig = createTestConfigWithTmpFolder()
    const prismaClient = await createTestPrismaClient({ withoutFixtures: true })
    testContainer.registerInstance<CoreConfig>("CoreConfig", config)
    testContainer.registerInstance<PrismaClient>("PrismaClient", prismaClient)
    testContainer.register<AuthSource>("AuthSource", LocalAuthSourceImpl)
  })

  it("Session data check for signup", async () => {
    await runWithDiContainer(testContainer, async () => {
      const authService = testContainer.resolve<AuthService>("AuthService")
      const { localAuthProps } = await authService.signup({
        email: testNotExistUserEmail,
        token: "",
      })
      expect(localAuthProps).not.toBeUndefined()

      // Initial password
      const initialResult = authService.signinWithEmail({
        email: testNotExistUserEmail,
        password: localAuthProps!.initialPassword,
      })
      await expect(initialResult).rejects.toThrow(PasswordInitializationRequired)
      const session = await initialResult.catch((e) => {
        const data = JSON.parse(e.message)
        return data["data"]
      })

      // After password initialization, signin should succeed.
      const { idToken } = await authService.initiatePassword({
        email: testNotExistUserEmail,
        newPassword: "new-password",
        sessionCode: session,
      })

      const { email: decodedEmail } = decodeJwt(idToken)
      expect(decodedEmail).toBe(testNotExistUserEmail)

      // Expect successful signin with new password.
      await authService.signinWithEmail({
        email: testNotExistUserEmail,
        password: "new-password",
      })

      const signinFails = authService.signinWithEmail({
        email: testNotExistUserEmail,
        password: "wrong-password",
      })
      await expect(signinFails).rejects.toThrow(AuthenticationError)
    })
  })
})
