import { PrismaClient } from "@prisma/client"
import { afterEach, beforeEach, describe, expect, it } from "vitest"

import { getDiContainer } from "@wr/composition"
import { CoreConfig } from "@wr/core"
import { runWithDiContainer } from "@wr/shared-node"
import { fixtureFactory } from "@wr/testing"

import { TokenUsageOnUserSource } from "./tokenUsageOnUser"

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
    const { user } = await fixtureFactory.createTenantWithOwner()
    await runWithDiContainer(testContainer, async () => {
      const tokenUsageSource = testContainer.resolve<TokenUsageOnUserSource>("TokenUsageOnUserSource")

      // Create a chat and consumed tokens to populate the view
      const chat = await prismaClient.chat.create({
        data: { userId: user.id },
      })
      await prismaClient.consumedToken.create({
        data: {
          provider: "openai",
          model: "gpt-4o",
          inputTokens: 100,
          outputTokens: 50,
          noCacheInputTokens: 10,
          cachedInputTokens: 5,
          chatId: chat.id,
        },
      })

      // Check findMany
      const { data: usages } = await tokenUsageSource.findMany("EntityTokenUsageOnUser", {
        where: { userId: user.id },
      })
      expect(usages.length).toBeGreaterThanOrEqual(1)
      expect(usages[0]?.userId).toBe(user.id)

      // Check findAll
      const allUsages = await tokenUsageSource.findAll("EntityTokenUsageOnUser", {
        where: { userId: user.id },
      })
      expect(allUsages.length).toBeGreaterThanOrEqual(1)
      expect(allUsages[0]?.userId).toBe(user.id)

      // Check find
      const foundUsage = await tokenUsageSource.find("EntityTokenUsageOnUser", {
        where: { userId: user.id },
      })
      expect(foundUsage?.userId).toBe(user.id)
      expect(foundUsage?.model).toBe("gpt-4o")
      expect(foundUsage?.inputTokens).toBe(100)

      // Check findIfExists 1
      const foundUsage2 = await tokenUsageSource.findIfExists("EntityTokenUsageOnUser", {
        where: { userId: user.id },
      })
      expect(foundUsage2?.userId).toBe(user.id)

      // Check findIfExists 2 (non-existent record)
      const foundUsage3 = await tokenUsageSource.findIfExists("EntityTokenUsageOnUser", {
        where: { userId: "non-existent-user" },
      })
      expect(foundUsage3).toBeNull()

      // Check count
      const count = await tokenUsageSource.count({
        where: { userId: user.id },
      })
      expect(count).toBeGreaterThanOrEqual(1)

      // Check exists 1
      const exists1 = await tokenUsageSource.exists({
        where: { userId: user.id },
      })
      expect(exists1).toBe(true)

      // Check exists 2 (non-existent user)
      const exists2 = await tokenUsageSource.exists({
        where: { userId: "non-existent-user" },
      })
      expect(exists2).toBe(false)
    })
  })
})
