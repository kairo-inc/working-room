import { PrismaClient } from "@prisma/client"
import { afterEach, beforeEach, describe, expect, it } from "vitest"

import { getDiContainer } from "@wr/composition"
import { CoreConfig } from "@wr/core"
import { NotFoundError } from "@wr/shared"
import { runWithDiContainer } from "@wr/shared-node"
import { fixtureFactory } from "@wr/testing"

import { TenantSource } from "./tenant"

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
    await runWithDiContainer(testContainer, async () => {
      const tenantSource = testContainer.resolve<TenantSource>("TenantSource")

      // Create an existing tenant
      const existTenant = await prismaClient.tenant.create({
        data: { name: "Exist Tenant" },
      })

      // Create a deleted tenant
      const deletedTenant = await prismaClient.tenant.create({
        data: { name: "Deleted Tenant", deletedAt: new Date() },
      })

      // Check findMany
      const { data: tenants } = await tenantSource.findMany("EntityTenant", {
        where: { id: existTenant.id },
      })
      expect(tenants).toHaveLength(1)
      expect(tenants[0]?.id).toBe(existTenant.id)
      expect(tenants[0]?.name).toBe(existTenant.name)

      // Check findAll
      const allTenants = await tenantSource.findAll("EntityTenant", {
        where: { id: existTenant.id },
      })
      expect(allTenants).toHaveLength(1)
      expect(allTenants[0]?.id).toBe(existTenant.id)
      expect(allTenants[0]?.name).toBe(existTenant.name)

      // Check find 1
      const foundTenant = await tenantSource.find("EntityTenant", {
        where: { id: existTenant.id },
      })
      expect(foundTenant?.id).toBe(existTenant.id)
      expect(foundTenant?.name).toBe(existTenant.name)

      // Check find 2
      const foundTenant2 = tenantSource.find("EntityTenant", {
        where: { id: deletedTenant.id },
      })
      await expect(foundTenant2).rejects.throws(NotFoundError)

      // Check findIfExists 1
      const foundTenant3 = await tenantSource.findIfExists("EntityTenant", {
        where: { id: existTenant.id },
      })
      expect(foundTenant3?.id).toBe(existTenant.id)
      expect(foundTenant3?.name).toBe(existTenant.name)

      // Check findIfExists 2
      const foundTenant4 = await tenantSource.findIfExists("EntityTenant", {
        where: { id: deletedTenant.id },
      })
      expect(foundTenant4).toBeNull()

      // Check count
      const count = await tenantSource.count({
        where: { id: existTenant.id },
      })
      expect(count).toBe(1)

      // Check exists 1
      const exists1 = await tenantSource.exists({
        where: { id: existTenant.id },
      })
      expect(exists1).toBe(true)

      // Check exists 2 (deleted record)
      const exists2 = await tenantSource.exists({
        where: { id: deletedTenant.id },
      })
      expect(exists2).toBe(false)
    })
  })
})
