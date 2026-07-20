import { PrismaClient } from "@prisma/client"
import { afterEach, beforeEach, describe, expect, it } from "vitest"

import { getDiContainer } from "@wr/composition"
import { CoreConfig } from "@wr/core"
import { NotFoundError } from "@wr/shared"
import { randomId, runWithDiContainer } from "@wr/shared-node"
import { fixtureFactory } from "@wr/testing"

import { UserSource } from "./user"

describe("[Success] Find records", () => {
  let testContainer: ReturnType<typeof getDiContainer>
  let prismaClient: PrismaClient
  let config: CoreConfig

  beforeEach(async () => {
    testContainer = getDiContainer().createChildContainer()
    config = fixtureFactory.createTestConfigWithTmpFolder()
    prismaClient = await fixtureFactory.createDbClient()
    testContainer.registerInstance<CoreConfig>("CoreConfig", config)
    testContainer.registerInstance<PrismaClient>("PrismaClient", prismaClient)
  })

  afterEach(async () => {
    await fixtureFactory.resetDatabase()
    await fixtureFactory.removeTestFolder(config)
  })

  it("Filter out deleted records", async () => {
    const { user, tenant, folders } = await fixtureFactory.createTenantWithOwner()
    await runWithDiContainer(testContainer, async () => {
      const userSource = testContainer.resolve<UserSource>("UserSource")

      const uid = randomId()

      // Create a deleted user
      const deletedUser = await prismaClient.user.create({
        data: {
          email: `deleted-user-${uid}@test.com`,
          sub: `sub-deleted-${uid}`,
          name: "Deleted User",
          role: "member",
          tenant: { connect: { id: tenant.id } },
          deletedAt: new Date(),
          privateDir: {
            create: {
              name: "private",
              birthtime: new Date(),
              mtime: new Date(),
              isRoot: false,
              isDirectory: true,
              pathIds: `${folders.root.pathIds}/private-deleted-${uid}`,
              mimeType: "inode/directory",
              size: 0,
              blobHash: `hash-deleted-${uid}`,
              tenantId: tenant.id,
            },
          },
        },
      })

      // Check findMany
      const { data: users } = await userSource.findMany("EntityUser", {
        where: { tenantId: tenant.id },
      })
      expect(users).toHaveLength(1)
      expect(users[0]?.id).toBe(user.id)
      expect(users[0]?.email).toBe(user.email)

      // Check findAll
      const allUsers = await userSource.findAll("EntityUser", {
        where: { tenantId: tenant.id },
      })
      expect(allUsers).toHaveLength(1)
      expect(allUsers[0]?.id).toBe(user.id)
      expect(allUsers[0]?.email).toBe(user.email)

      // Check find 1
      const foundUser = await userSource.find("EntityUser", {
        where: { id: user.id },
      })
      expect(foundUser?.id).toBe(user.id)
      expect(foundUser?.email).toBe(user.email)

      // Check find 2
      const foundUser2 = userSource.find("EntityUser", {
        where: { id: deletedUser.id },
      })
      await expect(foundUser2).rejects.throws(NotFoundError)

      // Check findIfExists 1
      const foundUser3 = await userSource.findIfExists("EntityUser", {
        where: { id: user.id },
      })
      expect(foundUser3?.id).toBe(user.id)
      expect(foundUser3?.email).toBe(user.email)

      // Check findIfExists 2
      const foundUser4 = await userSource.findIfExists("EntityUser", {
        where: { id: deletedUser.id },
      })
      expect(foundUser4).toBeNull()

      // Check count
      const count = await userSource.count({
        where: { tenantId: tenant.id },
      })
      expect(count).toBe(1)

      // Check exists 1
      const exists1 = await userSource.exists({
        where: { id: user.id },
      })
      expect(exists1).toBe(true)

      // Check exists 2 (deleted record)
      const exists2 = await userSource.exists({
        where: { id: deletedUser.id },
      })
      expect(exists2).toBe(false)
    })
  })
})
