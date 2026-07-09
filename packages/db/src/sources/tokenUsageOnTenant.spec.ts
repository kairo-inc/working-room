import { PrismaClient } from "@prisma/client"
import { afterEach, beforeEach, describe, expect, it } from "vitest"

import { getDiContainer } from "@wr/composition"
import { CoreConfig } from "@wr/core"
import { runWithDiContainer } from "@wr/shared-node"
import { fixtureFactory } from "@wr/testing"

import { TokenUsageOnTenantSource } from "./tokenUsageOnTenant"

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

  it("Find records from view (aggregated from ConsumedToken)", async () => {
    const { user, tenant } = await fixtureFactory.createTenantWithOwner()
    await runWithDiContainer(testContainer, async () => {
      const tokenUsageSource = testContainer.resolve<TokenUsageOnTenantSource>("TokenUsageOnTenantSource")

      // Create a chat and consumed tokens to populate the view
      const chat = await prismaClient.chat.create({
        data: { userId: user.id },
      })
      await prismaClient.consumedToken.create({
        data: {
          provider: "openai",
          model: "gpt-4o",
          inputTokens: 200,
          outputTokens: 80,
          noCacheInputTokens: 20,
          cachedInputTokens: 10,
          chatId: chat.id,
        },
      })

      // Check findMany
      const { data: usages } = await tokenUsageSource.findMany("EntityTokenUsageOnTenant", {
        where: { tenantId: tenant.id },
      })
      expect(usages.length).toBeGreaterThanOrEqual(1)
      expect(usages[0]?.tenantId).toBe(tenant.id)

      // Check findAll
      const allUsages = await tokenUsageSource.findAll("EntityTokenUsageOnTenant", {
        where: { tenantId: tenant.id },
      })
      expect(allUsages.length).toBeGreaterThanOrEqual(1)
      expect(allUsages[0]?.tenantId).toBe(tenant.id)

      // Check find
      const foundUsage = await tokenUsageSource.find("EntityTokenUsageOnTenant", {
        where: { tenantId: tenant.id },
      })
      expect(foundUsage?.tenantId).toBe(tenant.id)
      expect(foundUsage?.model).toBe("gpt-4o")
      expect(foundUsage?.inputTokens).toBe(200)

      // Check findIfExists 1
      const foundUsage2 = await tokenUsageSource.findIfExists("EntityTokenUsageOnTenant", {
        where: { tenantId: tenant.id },
      })
      expect(foundUsage2?.tenantId).toBe(tenant.id)

      // Check findIfExists 2 (non-existent record)
      const foundUsage3 = await tokenUsageSource.findIfExists("EntityTokenUsageOnTenant", {
        where: { tenantId: "non-existent-tenant" },
      })
      expect(foundUsage3).toBeNull()

      // Check count
      const count = await tokenUsageSource.count({
        where: { tenantId: tenant.id },
      })
      expect(count).toBeGreaterThanOrEqual(1)

      // Check exists 1
      const exists1 = await tokenUsageSource.exists({
        where: { tenantId: tenant.id },
      })
      expect(exists1).toBe(true)

      // Check exists 2 (non-existent tenant)
      const exists2 = await tokenUsageSource.exists({
        where: { tenantId: "non-existent-tenant" },
      })
      expect(exists2).toBe(false)
    })
  })
})
