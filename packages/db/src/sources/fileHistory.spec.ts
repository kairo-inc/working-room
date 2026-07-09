import { PrismaClient } from "@prisma/client"
import { afterEach, beforeEach, describe, expect, it } from "vitest"

import { getDiContainer } from "@wr/composition"
import { CoreConfig } from "@wr/core"
import { NotFoundError } from "@wr/shared"
import { runWithDiContainer } from "@wr/shared-node"
import { fixtureFactory } from "@wr/testing"

import { FileHistorySource } from "./fileHistory"

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
    const { user, dirs } = await fixtureFactory.createTenantWithOwner()
    await runWithDiContainer(testContainer, async () => {
      const fileHistorySource = testContainer.resolve<FileHistorySource>("FileHistorySource")

      // Create a file to attach history to
      const file = await prismaClient.fileDescriptor.create({
        data: {
          name: "test-file.txt",
          mimeType: "text/plain",
          size: 100,
          birthtime: new Date(),
          mtime: new Date(),
          blobHash: "dummy-hash",
          pathIds: `${dirs.root.pathIds}/test-file.txt`,
          parentId: dirs.root.id,
          tenantId: user.tenantId,
        },
      })

      // Create first file history record
      const firstHistory = await prismaClient.fileHistory.create({
        data: {
          fileDescriptorId: file.id,
          operation: "create",
          userId: user.id,
        },
      })

      // Create second file history record
      const secondHistory = await prismaClient.fileHistory.create({
        data: {
          fileDescriptorId: file.id,
          operation: "edit",
          blobHash: "new-hash",
          userId: user.id,
        },
      })

      // Check findMany
      const { data: histories } = await fileHistorySource.findMany("EntityFileHistory", {
        where: { fileDescriptorId: file.id, operation: "create" },
      })
      expect(histories).toHaveLength(1)
      expect(histories[0]?.id).toBe(firstHistory.id)
      expect(histories[0]?.operation).toBe(firstHistory.operation)

      // Check findAll
      const allHistories = await fileHistorySource.findAll("EntityFileHistory", {
        where: { fileDescriptorId: file.id },
      })
      expect(allHistories).toHaveLength(2)

      // Check find 1
      const foundHistory = await fileHistorySource.find("EntityFileHistory", {
        where: { id: firstHistory.id },
      })
      expect(foundHistory?.id).toBe(firstHistory.id)
      expect(foundHistory?.operation).toBe(firstHistory.operation)

      // Check find 2 (non-existent record)
      const foundHistory2 = fileHistorySource.find("EntityFileHistory", {
        where: { id: "non-existent-id" },
      })
      await expect(foundHistory2).rejects.throws(NotFoundError)

      // Check findIfExists 1
      const foundHistory3 = await fileHistorySource.findIfExists("EntityFileHistory", {
        where: { id: firstHistory.id },
      })
      expect(foundHistory3?.id).toBe(firstHistory.id)

      // Check findIfExists 2 (non-existent record)
      const foundHistory4 = await fileHistorySource.findIfExists("EntityFileHistory", {
        where: { id: "non-existent-id" },
      })
      expect(foundHistory4).toBeNull()

      // Check count
      const count = await fileHistorySource.count({
        where: { fileDescriptorId: file.id },
      })
      expect(count).toBe(2)

      // Check exists 1
      const exists1 = await fileHistorySource.exists({
        where: { id: firstHistory.id },
      })
      expect(exists1).toBe(true)

      // Check exists 2
      const exists2 = await fileHistorySource.exists({
        where: { id: secondHistory.id },
      })
      expect(exists2).toBe(true)

      // Check exists 3 (non-existent record)
      const exists3 = await fileHistorySource.exists({
        where: { id: "non-existent-id" },
      })
      expect(exists3).toBe(false)
    })
  })
})
