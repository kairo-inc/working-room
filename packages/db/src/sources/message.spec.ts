import { PrismaClient } from "@prisma/client"
import { afterEach, beforeEach, describe, expect, it } from "vitest"

import { getDiContainer } from "@wr/composition"
import { CoreConfig } from "@wr/core"
import { NotFoundError } from "@wr/shared"
import { runWithDiContainer } from "@wr/shared-node"
import { fixtureFactory } from "@wr/testing"

import { MessageSource } from "./message"

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
      const messageSource = testContainer.resolve<MessageSource>("MessageSource")

      // Create a chat for the user
      const chat = await prismaClient.chat.create({
        data: {
          userId: user.id,
        },
      })

      // Create an existing message
      const existMessage = await prismaClient.message.create({
        data: {
          chatId: chat.id,
          role: "user",
          content: "Hello",
          sequence: 1,
          isUserFacing: true,
        },
      })

      // Create a deleted message
      const deletedMessage = await prismaClient.message.create({
        data: {
          chatId: chat.id,
          role: "assistant",
          content: "Deleted response",
          sequence: 2,
          isUserFacing: false,
          deletedAt: new Date(),
        },
      })

      // Check findMany
      const { data: messages } = await messageSource.findMany("EntityMessage", {
        where: { chatId: chat.id },
      })
      expect(messages).toHaveLength(1)
      expect(messages[0]?.id).toBe(existMessage.id)
      expect(messages[0]?.content).toBe(existMessage.content)

      // Check findAll
      const allMessages = await messageSource.findAll("EntityMessage", {
        where: { chatId: chat.id },
      })
      expect(allMessages).toHaveLength(1)
      expect(allMessages[0]?.id).toBe(existMessage.id)
      expect(allMessages[0]?.content).toBe(existMessage.content)

      // Check find 1
      const foundMessage = await messageSource.find("EntityMessage", {
        where: { id: existMessage.id },
      })
      expect(foundMessage?.id).toBe(existMessage.id)
      expect(foundMessage?.content).toBe(existMessage.content)

      // Check find 2
      const foundMessage2 = messageSource.find("EntityMessage", {
        where: { id: deletedMessage.id },
      })
      await expect(foundMessage2).rejects.throws(NotFoundError)

      // Check findIfExists 1
      const foundMessage3 = await messageSource.findIfExists("EntityMessage", {
        where: { id: existMessage.id },
      })
      expect(foundMessage3?.id).toBe(existMessage.id)
      expect(foundMessage3?.content).toBe(existMessage.content)

      // Check findIfExists 2
      const foundMessage4 = await messageSource.findIfExists("EntityMessage", {
        where: { id: deletedMessage.id },
      })
      expect(foundMessage4).toBeNull()

      // Check count
      const count = await messageSource.count({
        where: { chatId: chat.id },
      })
      expect(count).toBe(1)

      // Check exists 1
      const exists1 = await messageSource.exists({
        where: { id: existMessage.id },
      })
      expect(exists1).toBe(true)

      // Check exists 2 (deleted record)
      const exists2 = await messageSource.exists({
        where: { id: deletedMessage.id },
      })
      expect(exists2).toBe(false)
    })
  })
})
