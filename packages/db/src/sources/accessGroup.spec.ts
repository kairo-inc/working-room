import { PrismaClient } from "@prisma/client"
import { afterEach, beforeEach, describe, expect, it } from "vitest"

import { getDiContainer } from "@wr/composition"
import { CoreConfig } from "@wr/core"
import { NotFoundError } from "@wr/shared"
import { runWithDiContainer } from "@wr/shared-node"
import { fixtureFactory } from "@wr/testing"

import { AccessGroupSource } from "./accessGroup"

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
    const { tenant } = await fixtureFactory.createTenantWithOwner()
    await runWithDiContainer(testContainer, async () => {
      const accessGroupSource = testContainer.resolve<AccessGroupSource>("AccessGroupSource")

      // Create an existing access group
      const existGroup = await prismaClient.accessGroup.create({
        data: {
          name: "test-group",
          read: true,
          write: false,
          tenantId: tenant.id,
        },
      })

      // Create a deleted access group
      const deletedGroup = await prismaClient.accessGroup.create({
        data: {
          name: "deleted-group",
          read: true,
          write: false,
          tenantId: tenant.id,
          deletedAt: new Date(),
        },
      })

      // Check findMany
      const { data: groups } = await accessGroupSource.findMany("EntityAccessGroup", {
        where: { tenantId: tenant.id, isPersonal: false, isOwner: false },
      })
      expect(groups).toHaveLength(1)
      expect(groups[0]?.id).toBe(existGroup.id)
      expect(groups[0]?.name).toBe(existGroup.name)

      // Check findAll
      const allGroups = await accessGroupSource.findAll("EntityAccessGroup", {
        where: { tenantId: tenant.id, isPersonal: false, isOwner: false },
      })
      expect(allGroups).toHaveLength(1)
      expect(allGroups[0]?.id).toBe(existGroup.id)
      expect(allGroups[0]?.name).toBe(existGroup.name)

      // Check find 1
      const foundGroup = await accessGroupSource.find("EntityAccessGroup", {
        where: { id: existGroup.id },
      })
      expect(foundGroup?.id).toBe(existGroup.id)
      expect(foundGroup?.name).toBe(existGroup.name)

      // Check find 2
      const foundGroup2 = accessGroupSource.find("EntityAccessGroup", {
        where: { id: deletedGroup.id },
      })
      await expect(foundGroup2).rejects.throws(NotFoundError)

      // Check findIfExists 1
      const foundGroup3 = await accessGroupSource.findIfExists("EntityAccessGroup", {
        where: { id: existGroup.id },
      })
      expect(foundGroup3?.id).toBe(existGroup.id)
      expect(foundGroup3?.name).toBe(existGroup.name)

      // Check findIfExists 2
      const foundGroup4 = await accessGroupSource.findIfExists("EntityAccessGroup", {
        where: { id: deletedGroup.id },
      })
      expect(foundGroup4).toBeNull()

      // Check count
      const count = await accessGroupSource.count({
        where: { tenantId: tenant.id, isPersonal: false, isOwner: false },
      })
      expect(count).toBe(1)

      // Check exists 1
      const exists1 = await accessGroupSource.exists({
        where: { id: existGroup.id },
      })
      expect(exists1).toBe(true)

      // Check exists 2 (deleted record)
      const exists2 = await accessGroupSource.exists({
        where: { id: deletedGroup.id },
      })
      expect(exists2).toBe(false)
    })
  })
})
