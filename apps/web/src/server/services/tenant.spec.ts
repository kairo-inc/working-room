import { PrismaClient } from "@prisma/client"
import { afterEach } from "node:test"
import { beforeEach, describe, expect, it } from "vitest"

import { CoreConfig } from "@wr/core"
import { BadRequestError, NoContextError, PermissionDeniedError } from "@wr/shared"
import { runWithDiContainer, runWithPrivateContext } from "@wr/shared-node"
import { fixtureFactory } from "@wr/testing"

import { getWebAppDiContainer } from "../container"
import { TenantService } from "./tenantType"

describe("[Success] TenantService", async () => {
  let testContainer: ReturnType<typeof getWebAppDiContainer>
  let prismaClient: PrismaClient
  let config: CoreConfig

  beforeEach(async () => {
    testContainer = getWebAppDiContainer()
    config = fixtureFactory.createTestConfigWithTmpFolder()
    prismaClient = await fixtureFactory.createDbClient()
    testContainer.registerInstance<PrismaClient>("PrismaClient", prismaClient)
    testContainer.registerInstance<CoreConfig>("CoreConfig", config)
  })

  afterEach(async () => {
    await fixtureFactory.resetDatabase()
    await fixtureFactory.removeTestFolder(config)
  })

  it("User invitation with local auth", async () => {
    const { user: ownerUser } = await fixtureFactory.createTenantWithOwner()
    const newUserEmail = `new-${Date.now()}@workingroom.io`

    await runWithDiContainer(testContainer, async () => {
      const tenantService = testContainer.resolve<TenantService>("TenantService")
      const result = await runWithPrivateContext({ idToken: ownerUser.idToken }, async () => {
        return await tenantService.invite({
          email: newUserEmail,
          role: "member",
        })
      })

      expect(result.localAuthResult).not.toBeUndefined()

      const user = await prismaClient.user.findFirst({ where: { email: newUserEmail } })
      expect(user).not.toBeNull()
      expect(user?.role).toBe("member")
      expect(user?.email).toBe(newUserEmail)

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
  let config: CoreConfig

  beforeEach(async () => {
    testContainer = getWebAppDiContainer().createChildContainer()
    config = fixtureFactory.createTestConfigWithTmpFolder()
    prismaClient = await fixtureFactory.createDbClient()

    testContainer.registerInstance<CoreConfig>("CoreConfig", config)
    testContainer.registerInstance<PrismaClient>("PrismaClient", prismaClient)
  })

  afterEach(async () => {
    await fixtureFactory.resetDatabase()
    await fixtureFactory.removeTestFolder(config)
  })

  it("Can't invite user with owner role", async () => {
    const { user: ownerUser } = await fixtureFactory.createTenantWithOwner()
    const newUserEmail = `new-${Date.now()}@workingroom.io`
    await runWithDiContainer(testContainer, async () => {
      const tenantService = testContainer.resolve<TenantService>("TenantService")
      const result = runWithPrivateContext({ idToken: ownerUser.idToken }, async () => {
        return await tenantService.invite({
          email: newUserEmail,
          role: "owner",
        })
      })
      await expect(result).rejects.toThrow(BadRequestError)
    })
  })

  it("Can't invite user with member role", async () => {
    const { memberUser } = await fixtureFactory.createTenantWithOwnerAndOtherUsers()
    const newUserEmail = `new-${Date.now()}@workingroom.io`

    await runWithDiContainer(testContainer, async () => {
      const tenantService = testContainer.resolve<TenantService>("TenantService")
      const notPermitted = runWithPrivateContext({ idToken: memberUser.idToken }, async () => {
        return await tenantService.invite({
          email: newUserEmail,
          role: "admin",
        })
      })
      await expect(notPermitted).rejects.toThrow(PermissionDeniedError)
      const noContext = tenantService.invite({
        email: newUserEmail,
        role: "admin",
      })
      await expect(noContext).rejects.toThrow(NoContextError)
    })
  })
})
