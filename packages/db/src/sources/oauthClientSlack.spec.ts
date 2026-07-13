import { PrismaClient } from "@prisma/client"
import { afterEach, beforeEach, describe, expect, it } from "vitest"

import { getDiContainer } from "@wr/composition"
import { CoreConfig } from "@wr/core"
import { NotFoundError } from "@wr/shared"
import { runWithDiContainer } from "@wr/shared-node"
import { fixtureFactory } from "@wr/testing"

import { OauthClientSlackSource } from "./oauthClientSlack"

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
      const oauthClientSlackSource = testContainer.resolve<OauthClientSlackSource>("OauthClientSlackSource")

      const connection = await prismaClient.oauthClientSlack.create({
        data: {
          accessToken: "access-token",
          refreshToken: "refresh-token",
          scope: "channels:read chat:write",
          teamId: "T123",
          teamName: "Test Team",
          userId: user.id,
        },
      })

      const deletedConnection = await prismaClient.oauthClientSlack.create({
        data: {
          accessToken: "deleted-access-token",
          refreshToken: "deleted-refresh-token",
          scope: "channels:read",
          teamId: "T456",
          teamName: "Deleted Team",
          userId: user.id,
          deletedAt: new Date(),
        },
      })

      // Check findMany
      const { data: connections } = await oauthClientSlackSource.findMany("EntityOauthClientSlack", {
        where: { userId: user.id },
      })
      expect(connections).toHaveLength(1)
      expect(connections[0]?.id).toBe(connection.id)
      expect(connections[0]?.teamId).toBe(connection.teamId)

      // Check findAll
      const allConnections = await oauthClientSlackSource.findAll("EntityOauthClientSlack", {
        where: { userId: user.id },
      })
      expect(allConnections).toHaveLength(1)
      expect(allConnections[0]?.id).toBe(connection.id)

      // Check find 1
      const foundConnection = await oauthClientSlackSource.find("EntityOauthClientSlack", {
        where: { id: connection.id },
      })
      expect(foundConnection?.id).toBe(connection.id)
      expect(foundConnection?.teamName).toBe(connection.teamName)

      // Check find 2 (deleted record)
      const foundConnection2 = oauthClientSlackSource.find("EntityOauthClientSlack", {
        where: { id: deletedConnection.id },
      })
      await expect(foundConnection2).rejects.throws(NotFoundError)

      // Check findIfExists 1
      const foundConnection3 = await oauthClientSlackSource.findIfExists("EntityOauthClientSlack", {
        where: { id: connection.id },
      })
      expect(foundConnection3?.id).toBe(connection.id)

      // Check findIfExists 2 (deleted record)
      const foundConnection4 = await oauthClientSlackSource.findIfExists("EntityOauthClientSlack", {
        where: { id: deletedConnection.id },
      })
      expect(foundConnection4).toBeNull()

      // Check count
      const count = await oauthClientSlackSource.count({
        where: { userId: user.id },
      })
      expect(count).toBe(1)

      // Check exists 1
      const exists1 = await oauthClientSlackSource.exists({
        where: { id: connection.id },
      })
      expect(exists1).toBe(true)

      // Check exists 2 (deleted record)
      const exists2 = await oauthClientSlackSource.exists({
        where: { id: deletedConnection.id },
      })
      expect(exists2).toBe(false)
    })
  })
})

describe("[Success] Soft delete", () => {
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

  it("Sets deletedAt instead of removing the record by default", async () => {
    const { user } = await fixtureFactory.createTenantWithOwner()
    await runWithDiContainer(testContainer, async () => {
      const oauthClientSlackSource = testContainer.resolve<OauthClientSlackSource>("OauthClientSlackSource")

      const connection = await prismaClient.oauthClientSlack.create({
        data: {
          accessToken: "access-token",
          refreshToken: "refresh-token",
          scope: "channels:read",
          teamId: "T123",
          teamName: "Test Team",
          userId: user.id,
        },
      })

      await oauthClientSlackSource.delete({ where: { id: connection.id } })

      const stillInDb = await prismaClient.oauthClientSlack.findUniqueOrThrow({ where: { id: connection.id } })
      expect(stillInDb.deletedAt).not.toBeNull()

      const exists = await oauthClientSlackSource.exists({ where: { id: connection.id } })
      expect(exists).toBe(false)
    })
  })

  it("Removes the record when physically is true", async () => {
    const { user } = await fixtureFactory.createTenantWithOwner()
    await runWithDiContainer(testContainer, async () => {
      const oauthClientSlackSource = testContainer.resolve<OauthClientSlackSource>("OauthClientSlackSource")

      const connection = await prismaClient.oauthClientSlack.create({
        data: {
          accessToken: "access-token",
          refreshToken: "refresh-token",
          scope: "channels:read",
          teamId: "T123",
          teamName: "Test Team",
          userId: user.id,
        },
      })

      await oauthClientSlackSource.delete({ where: { id: connection.id }, physically: true })

      await expect(prismaClient.oauthClientSlack.findUniqueOrThrow({ where: { id: connection.id } })).rejects.toThrow()
    })
  })
})
