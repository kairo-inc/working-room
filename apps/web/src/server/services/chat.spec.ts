import { PrismaClient } from "@prisma/client"
import { afterEach, beforeEach, describe, expect, it } from "vitest"

import { CoreConfig } from "@wr/core"
import { NotFoundError } from "@wr/shared"
import { runWithDiContainer, runWithPrivateContext } from "@wr/shared-node"
import { fixtureFactory } from "@wr/testing"

import { getWebAppDiContainer } from "../container"
import { ChatService } from "./chatType"

describe("ChatService auto-approve", () => {
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

  it("[Success] Is off for a new Chat, and can be switched on and off", async () => {
    const { user } = await fixtureFactory.createTenantWithOwner()
    await runWithDiContainer(testContainer, async () => {
      const service = testContainer.resolve<ChatService>("ChatService")
      await runWithPrivateContext({ idToken: user.idToken }, async () => {
        const chat = await service.create({})
        expect((await service.getStatus({ id: chat.id })).autoApprove).toBe(false)

        await service.edit({ id: chat.id, autoApprove: true })
        expect((await service.getStatus({ id: chat.id })).autoApprove).toBe(true)

        // Editing another setting keeps auto-approve as it is.
        await service.edit({ id: chat.id })
        expect((await service.getStatus({ id: chat.id })).autoApprove).toBe(true)

        await service.edit({ id: chat.id, autoApprove: false })
        expect((await service.getStatus({ id: chat.id })).autoApprove).toBe(false)
      })
    })
  })

  it("[Failure] Can not switch auto-approve on for another User's Chat", async () => {
    const { user: owner, memberUser: other } = await fixtureFactory.createTenantWithOwnerAndOtherUsers()
    await runWithDiContainer(testContainer, async () => {
      const service = testContainer.resolve<ChatService>("ChatService")
      const chat = await runWithPrivateContext({ idToken: owner.idToken }, () => service.create({}))

      await runWithPrivateContext({ idToken: other.idToken }, async () => {
        await expect(service.edit({ id: chat.id, autoApprove: true })).rejects.toThrow(NotFoundError)
      })
      const entity = await prismaClient.chat.findUniqueOrThrow({ where: { id: chat.id } })
      expect(entity.autoApprove).toBe(false)
    })
  })
})
