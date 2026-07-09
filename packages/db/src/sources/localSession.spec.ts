import { PrismaClient } from "@prisma/client"
import { afterEach, beforeEach, describe, expect, it } from "vitest"

import { getDiContainer } from "@wr/composition"
import { CoreConfig } from "@wr/core"
import { NotFoundError } from "@wr/shared"
import { runWithDiContainer } from "@wr/shared-node"
import { fixtureFactory } from "@wr/testing"

import { LocalSessionSource } from "./localSession"

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
      const localSessionSource = testContainer.resolve<LocalSessionSource>("LocalSessionSource")

      // Create a session for the user
      const session = await prismaClient.localSession.create({
        data: {
          jwt: `jwt-test-${user.id}`,
          userId: user.id,
          expiresAt: new Date(Date.now() + 1000 * 60 * 60),
        },
      })

      // Check findMany
      const { data: sessions } = await localSessionSource.findMany("EntityLocalSession", {
        where: { userId: user.id },
      })
      expect(sessions).toHaveLength(1)
      expect(sessions[0]?.id).toBe(session.id)
      expect(sessions[0]?.userId).toBe(session.userId)

      // Check findAll
      const allSessions = await localSessionSource.findAll("EntityLocalSession", {
        where: { userId: user.id },
      })
      expect(allSessions).toHaveLength(1)
      expect(allSessions[0]?.id).toBe(session.id)
      expect(allSessions[0]?.userId).toBe(session.userId)

      // Check find 1
      const foundSession = await localSessionSource.find("EntityLocalSession", {
        where: { id: session.id },
      })
      expect(foundSession?.id).toBe(session.id)
      expect(foundSession?.userId).toBe(session.userId)

      // Check find 2 (non-existent record)
      const foundSession2 = localSessionSource.find("EntityLocalSession", {
        where: { id: "non-existent-id" },
      })
      await expect(foundSession2).rejects.throws(NotFoundError)

      // Check findIfExists 1
      const foundSession3 = await localSessionSource.findIfExists("EntityLocalSession", {
        where: { id: session.id },
      })
      expect(foundSession3?.id).toBe(session.id)
      expect(foundSession3?.userId).toBe(session.userId)

      // Check findIfExists 2 (non-existent record)
      const foundSession4 = await localSessionSource.findIfExists("EntityLocalSession", {
        where: { id: "non-existent-id" },
      })
      expect(foundSession4).toBeNull()

      // Check count
      const count = await localSessionSource.count({
        where: { userId: user.id },
      })
      expect(count).toBe(1)

      // Check exists 1
      const exists1 = await localSessionSource.exists({
        where: { id: session.id },
      })
      expect(exists1).toBe(true)

      // Check exists 2 (non-existent record)
      const exists2 = await localSessionSource.exists({
        where: { id: "non-existent-id" },
      })
      expect(exists2).toBe(false)
    })
  })
})
