import { PrismaClient } from "@prisma/client"
import { afterEach, beforeEach, describe, expect, it } from "vitest"

import { getDiContainer } from "@wr/composition"
import { CoreConfig } from "@wr/core"
import { NotFoundError } from "@wr/shared"
import { runWithDiContainer } from "@wr/shared-node"
import { fixtureFactory } from "@wr/testing"

import { AgentSource } from "./agent"

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
    const { user, tenant } = await fixtureFactory.createTenantWithOwner()
    await runWithDiContainer(testContainer, async () => {
      const agentSource = testContainer.resolve<AgentSource>("AgentSource")

      const agentBase = {
        name: "Test Agent",
        descriptionForAgent: "A test agent",
        tier: "light",
        prompt: "You are a helpful assistant.",
        userId: user.id,
        tenantId: tenant.id,
      }

      // Create an existing agent
      const existAgent = await prismaClient.agent.create({
        data: agentBase,
      })

      // Create a deleted agent
      const deletedAgent = await prismaClient.agent.create({
        data: { ...agentBase, name: "Deleted Agent", deletedAt: new Date() },
      })

      // Check findMany
      const { data: agents } = await agentSource.findMany("EntityAgent", {
        where: { userId: user.id },
      })
      expect(agents).toHaveLength(1)
      expect(agents[0]?.id).toBe(existAgent.id)
      expect(agents[0]?.name).toBe(existAgent.name)

      // Check findAll
      const allAgents = await agentSource.findAll("EntityAgent", {
        where: { userId: user.id },
      })
      expect(allAgents).toHaveLength(1)
      expect(allAgents[0]?.id).toBe(existAgent.id)
      expect(allAgents[0]?.name).toBe(existAgent.name)

      // Check find 1
      const foundAgent = await agentSource.find("EntityAgent", {
        where: { id: existAgent.id },
      })
      expect(foundAgent?.id).toBe(existAgent.id)
      expect(foundAgent?.name).toBe(existAgent.name)

      // Check find 2
      const foundAgent2 = agentSource.find("EntityAgent", {
        where: { id: deletedAgent.id },
      })
      await expect(foundAgent2).rejects.throws(NotFoundError)

      // Check findIfExists 1
      const foundAgent3 = await agentSource.findIfExists("EntityAgent", {
        where: { id: existAgent.id },
      })
      expect(foundAgent3?.id).toBe(existAgent.id)
      expect(foundAgent3?.name).toBe(existAgent.name)

      // Check findIfExists 2
      const foundAgent4 = await agentSource.findIfExists("EntityAgent", {
        where: { id: deletedAgent.id },
      })
      expect(foundAgent4).toBeNull()

      // Check count
      const count = await agentSource.count({
        where: { userId: user.id },
      })
      expect(count).toBe(1)

      // Check exists 1
      const exists1 = await agentSource.exists({
        where: { id: existAgent.id },
      })
      expect(exists1).toBe(true)

      // Check exists 2 (deleted record)
      const exists2 = await agentSource.exists({
        where: { id: deletedAgent.id },
      })
      expect(exists2).toBe(false)
    })
  })
})
