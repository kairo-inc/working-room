import { PrismaClient } from "@prisma/client"
import { afterEach, beforeEach, describe, expect, it } from "vitest"

import { getDiContainer } from "@wr/composition"
import { CoreConfig } from "@wr/core"
import { NotFoundError } from "@wr/shared"
import { runWithDiContainer } from "@wr/shared-node"
import { fixtureFactory } from "@wr/testing"

import { McpServerSource } from "./mcpServer"

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
      const mcpServerSource = testContainer.resolve<McpServerSource>("McpServerSource")

      const server = await prismaClient.mcpServer.create({
        data: {
          name: "Test Server",
          url: "https://example.com/mcp",
          accessToken: "access-token",
          userId: user.id,
        },
      })

      const deletedServer = await prismaClient.mcpServer.create({
        data: {
          name: "Deleted Server",
          url: "https://deleted.example.com/mcp",
          accessToken: "deleted-access-token",
          userId: user.id,
          deletedAt: new Date(),
        },
      })

      // Check findMany
      const { data: servers } = await mcpServerSource.findMany("EntityMcpServer", {
        where: { userId: user.id },
      })
      expect(servers).toHaveLength(1)
      expect(servers[0]?.id).toBe(server.id)
      expect(servers[0]?.name).toBe(server.name)

      // Check findAll
      const allServers = await mcpServerSource.findAll("EntityMcpServer", {
        where: { userId: user.id },
      })
      expect(allServers).toHaveLength(1)
      expect(allServers[0]?.id).toBe(server.id)

      // Check find 1
      const foundServer = await mcpServerSource.find("EntityMcpServer", {
        where: { id: server.id },
      })
      expect(foundServer?.id).toBe(server.id)
      expect(foundServer?.url).toBe(server.url)

      // Check find 2 (deleted record)
      const foundServer2 = mcpServerSource.find("EntityMcpServer", {
        where: { id: deletedServer.id },
      })
      await expect(foundServer2).rejects.throws(NotFoundError)

      // Check findIfExists 1
      const foundServer3 = await mcpServerSource.findIfExists("EntityMcpServer", {
        where: { id: server.id },
      })
      expect(foundServer3?.id).toBe(server.id)

      // Check findIfExists 2 (deleted record)
      const foundServer4 = await mcpServerSource.findIfExists("EntityMcpServer", {
        where: { id: deletedServer.id },
      })
      expect(foundServer4).toBeNull()

      // Check count
      const count = await mcpServerSource.count({
        where: { userId: user.id },
      })
      expect(count).toBe(1)

      // Check exists 1
      const exists1 = await mcpServerSource.exists({
        where: { id: server.id },
      })
      expect(exists1).toBe(true)

      // Check exists 2 (deleted record)
      const exists2 = await mcpServerSource.exists({
        where: { id: deletedServer.id },
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
      const mcpServerSource = testContainer.resolve<McpServerSource>("McpServerSource")

      const server = await prismaClient.mcpServer.create({
        data: {
          name: "Test Server",
          url: "https://example.com/mcp",
          accessToken: "access-token",
          userId: user.id,
        },
      })

      await mcpServerSource.delete({ where: { id: server.id } })

      const stillInDb = await prismaClient.mcpServer.findUniqueOrThrow({ where: { id: server.id } })
      expect(stillInDb.deletedAt).not.toBeNull()

      const exists = await mcpServerSource.exists({ where: { id: server.id } })
      expect(exists).toBe(false)
    })
  })

  it("Removes the record when physically is true", async () => {
    const { user } = await fixtureFactory.createTenantWithOwner()
    await runWithDiContainer(testContainer, async () => {
      const mcpServerSource = testContainer.resolve<McpServerSource>("McpServerSource")

      const server = await prismaClient.mcpServer.create({
        data: {
          name: "Test Server",
          url: "https://example.com/mcp",
          accessToken: "access-token",
          userId: user.id,
        },
      })

      await mcpServerSource.delete({ where: { id: server.id }, physically: true })

      await expect(prismaClient.mcpServer.findUniqueOrThrow({ where: { id: server.id } })).rejects.toThrow()
    })
  })
})

describe("[Success] Create records", () => {
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

  it("Creates a server without an access token, enabled by default", async () => {
    const { user } = await fixtureFactory.createTenantWithOwner()
    await runWithDiContainer(testContainer, async () => {
      const mcpServerSource = testContainer.resolve<McpServerSource>("McpServerSource")

      const server = await mcpServerSource.create({
        data: {
          name: "Test Server",
          url: "https://example.com/mcp",
          user: { connect: { id: user.id } },
        },
      })

      expect(server.accessToken).toBeNull()
      expect(server.enabled).toBe(true)
      expect(server.userId).toBe(user.id)
    })
  })
})
