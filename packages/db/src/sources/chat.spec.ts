import { PrismaClient } from "@prisma/client"
import { afterEach, beforeEach, describe, expect, it } from "vitest"

import { getDiContainer } from "@wr/composition"
import { CoreConfig } from "@wr/core"
import { NotFoundError } from "@wr/shared"
import { runWithDiContainer } from "@wr/shared-node"
import { fixtureFactory } from "@wr/testing"

import { ChatSource } from "./chat"

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
    const { user } = await fixtureFactory.createTenantWithOwner()
    await runWithDiContainer(testContainer, async () => {
      const chatSource = testContainer.resolve<ChatSource>("ChatSource")

      // Create an existing chat
      const existChat = await prismaClient.chat.create({
        data: { userId: user.id },
      })

      // Create a deleted chat
      const deletedChat = await prismaClient.chat.create({
        data: { userId: user.id, deletedAt: new Date() },
      })

      // Check findMany
      const { data: chats } = await chatSource.findMany("EntityChat", {
        where: { userId: user.id },
      })
      expect(chats).toHaveLength(1)
      expect(chats[0]?.id).toBe(existChat.id)

      // Check findAll
      const allChats = await chatSource.findAll("EntityChat", {
        where: { userId: user.id },
      })
      expect(allChats).toHaveLength(1)
      expect(allChats[0]?.id).toBe(existChat.id)

      // Check find 1
      const foundChat = await chatSource.find("EntityChat", {
        where: { id: existChat.id },
      })
      expect(foundChat?.id).toBe(existChat.id)

      // Check find 2
      const foundChat2 = chatSource.find("EntityChat", {
        where: { id: deletedChat.id },
      })
      await expect(foundChat2).rejects.throws(NotFoundError)

      // Check findIfExists 1
      const foundChat3 = await chatSource.findIfExists("EntityChat", {
        where: { id: existChat.id },
      })
      expect(foundChat3?.id).toBe(existChat.id)

      // Check findIfExists 2
      const foundChat4 = await chatSource.findIfExists("EntityChat", {
        where: { id: deletedChat.id },
      })
      expect(foundChat4).toBeNull()

      // Check count
      const count = await chatSource.count({
        where: { userId: user.id },
      })
      expect(count).toBe(1)

      // Check exists 1
      const exists1 = await chatSource.exists({
        where: { id: existChat.id },
      })
      expect(exists1).toBe(true)

      // Check exists 2 (deleted record)
      const exists2 = await chatSource.exists({
        where: { id: deletedChat.id },
      })
      expect(exists2).toBe(false)
    })
  })
})
