import { PrismaClient } from "@prisma/client"
import { afterEach, beforeEach, describe, expect, it } from "vitest"

import { getDiContainer } from "@wr/composition"
import { CoreConfig } from "@wr/core"
import { NotFoundError } from "@wr/shared"
import { runWithDiContainer } from "@wr/shared-node"
import { fixtureFactory } from "@wr/testing"

import { ConsumedTokenSource } from "./consumedToken"

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

  it("Find records (no deletedAt filtering)", async () => {
    const { user } = await fixtureFactory.createTenantWithOwner()
    await runWithDiContainer(testContainer, async () => {
      const consumedTokenSource = testContainer.resolve<ConsumedTokenSource>("ConsumedTokenSource")

      // Create a chat to associate tokens with
      const chat = await prismaClient.chat.create({
        data: { userId: user.id },
      })

      const tokenBase = {
        provider: "openai",
        model: "gpt-4o",
        inputTokens: 100,
        outputTokens: 50,
        noCacheInputTokens: 10,
        cachedInputTokens: 5,
        chatId: chat.id,
      }

      // Create an existing token record
      const existToken = await prismaClient.consumedToken.create({
        data: tokenBase,
      })

      // Create another token record to verify filtering by id
      const otherToken = await prismaClient.consumedToken.create({
        data: { ...tokenBase, model: "gpt-4o-mini" },
      })

      // Check findMany
      const { data: tokens } = await consumedTokenSource.findMany("EntityConsumedToken", {
        where: { chatId: chat.id, model: "gpt-4o" },
      })
      expect(tokens).toHaveLength(1)
      expect(tokens[0]?.id).toBe(existToken.id)
      expect(tokens[0]?.model).toBe(existToken.model)

      // Check findAll
      const allTokens = await consumedTokenSource.findAll("EntityConsumedToken", {
        where: { chatId: chat.id },
      })
      expect(allTokens).toHaveLength(2)

      // Check find 1
      const foundToken = await consumedTokenSource.find("EntityConsumedToken", {
        where: { id: existToken.id },
      })
      expect(foundToken?.id).toBe(existToken.id)
      expect(foundToken?.model).toBe(existToken.model)

      // Check find 2 (non-existent record)
      const foundToken2 = consumedTokenSource.find("EntityConsumedToken", {
        where: { id: "non-existent-id" },
      })
      await expect(foundToken2).rejects.throws(NotFoundError)

      // Check findIfExists 1
      const foundToken3 = await consumedTokenSource.findIfExists("EntityConsumedToken", {
        where: { id: existToken.id },
      })
      expect(foundToken3?.id).toBe(existToken.id)

      // Check findIfExists 2 (non-existent record)
      const foundToken4 = await consumedTokenSource.findIfExists("EntityConsumedToken", {
        where: { id: "non-existent-id" },
      })
      expect(foundToken4).toBeNull()

      // Check count
      const count = await consumedTokenSource.count({
        where: { chatId: chat.id },
      })
      expect(count).toBe(2)

      // Check exists 1
      const exists1 = await consumedTokenSource.exists({
        where: { id: existToken.id },
      })
      expect(exists1).toBe(true)

      // Check exists 2
      const exists2 = await consumedTokenSource.exists({
        where: { id: otherToken.id },
      })
      expect(exists2).toBe(true)

      // Check exists 3 (non-existent record)
      const exists3 = await consumedTokenSource.exists({
        where: { id: "non-existent-id" },
      })
      expect(exists3).toBe(false)
    })
  })
})
