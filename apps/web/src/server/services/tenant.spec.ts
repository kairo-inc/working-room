import { PrismaClient } from "@prisma/client"
import { beforeEach, describe, expect, it } from "vitest"

import { CoreConfig } from "@wr/core"
import { BadRequestError, NoContextError, PermissionDeniedError } from "@wr/shared"
import { encodeJwt, runWithDiContainer, runWithPrivateContext } from "@wr/shared-node"
import {
  createTestConfigWithTmpFolder,
  createTestPrismaClient,
  testNotExistUserEmail,
  testUserEmail,
  testUserIdTokenAdmin,
} from "@wr/testing"

import { getWebAppDiContainer } from "../container"
import { TenantService } from "./tenantType"

describe("[Success] TenantService", async () => {
  let testContainer: ReturnType<typeof getWebAppDiContainer>
  let prismaClient: PrismaClient

  beforeEach(async () => {
    testContainer = getWebAppDiContainer()
    const config = createTestConfigWithTmpFolder()
    prismaClient = await createTestPrismaClient()
    testContainer.registerInstance<PrismaClient>("PrismaClient", prismaClient)
    testContainer.registerInstance<CoreConfig>("CoreConfig", config)
  })

  it("User invitation with local auth", async () => {
    await runWithDiContainer(testContainer, async () => {
      const tenantService = testContainer.resolve<TenantService>("TenantService")
      const result = await runWithPrivateContext({ idToken: testUserIdTokenAdmin }, async () => {
        return await tenantService.invite({
          email: testNotExistUserEmail,
          role: "member",
        })
      })

      expect(result.localAuthResult).not.toBeUndefined()

      const user = await prismaClient.user.findFirst({ where: { email: testNotExistUserEmail } })
      expect(user).not.toBeNull()
      expect(user?.role).toBe("member")
      expect(user?.email).toBe(testNotExistUserEmail)

      // Check folder existance created by temporary user.
      const file = await prismaClient.fileDescriptor.findFirst({ where: { ownerId: user!.id } })
      expect(file).not.toBeNull()

      // Role has property to access the created file directory.
      const accessGroup = await prismaClient.accessGroup.findFirst({
        where: { users: { some: { id: user!.id } } },
        include: { resources: true },
      })
      expect(accessGroup).not.toBeNull()
      expect(accessGroup?.isPersonal).toBe(true)
      expect(accessGroup?.resources.find((r) => r.id === file!.id)).not.toBeUndefined()
    })
  })
})

describe("[Failure] TenantService", () => {
  let testContainer: ReturnType<typeof getWebAppDiContainer>
  let prismaClient: PrismaClient
  beforeEach(async () => {
    testContainer = getWebAppDiContainer().createChildContainer()
    const config = createTestConfigWithTmpFolder()
    prismaClient = await createTestPrismaClient({ withoutFixtures: true })

    testContainer.registerInstance<CoreConfig>("CoreConfig", config)
    testContainer.registerInstance<PrismaClient>("PrismaClient", prismaClient)
  })

  it("Can't invite user with owner role", async () => {
    await runWithDiContainer(testContainer, async () => {
      const tenantService = testContainer.resolve<TenantService>("TenantService")
      const result = runWithPrivateContext({ idToken: testUserIdTokenAdmin }, async () => {
        return await tenantService.invite({
          email: testNotExistUserEmail,
          role: "owner",
        })
      })
      await expect(result).rejects.toThrow(BadRequestError)
    })
  })

  it("Can't invite user with member role", async () => {
    await runWithDiContainer(testContainer, async () => {
      const tenantService = testContainer.resolve<TenantService>("TenantService")
      const memberIdToken = encodeJwt(
        {
          email: testUserEmail,
          role: "member",
          userId: "test-member-user-id",
          tenantId: "test-tenant-id",
        },
        "test-secret"
      )
      const notPermitted = runWithPrivateContext({ idToken: memberIdToken }, async () => {
        return await tenantService.invite({
          email: testNotExistUserEmail,
          role: "admin",
        })
      })
      await expect(notPermitted).rejects.toThrow(PermissionDeniedError)

      const noContext = tenantService.invite({
        email: testNotExistUserEmail,
        role: "admin",
      })
      await expect(noContext).rejects.toThrow(NoContextError)
    })
  })
})
