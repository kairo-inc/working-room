import { PrismaClient } from "@prisma/client"
import { afterEach, beforeEach, describe, expect, it } from "vitest"

import { getDiContainer } from "@wr/composition"
import { CoreConfig } from "@wr/core"
import { NotFoundError } from "@wr/shared"
import { runWithDiContainer, runWithPrivateContext } from "@wr/shared-node"
import { fixtureFactory } from "@wr/testing"

import { FileDescriptorSource } from "./fileDescriptor"

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
      const fileDescriptorSource = testContainer.resolve<FileDescriptorSource>("FileDescriptorSource")
      await runWithPrivateContext({ idToken: user.idToken }, async () => {
        // Create a file in the private directory
        const existFile = await prismaClient.fileDescriptor.create({
          data: {
            name: "test-file",
            mimeType: "text/plain",
            size: 100,
            birthtime: new Date(),
            blobHash: "dummy-hash",
            mtime: new Date(),
            pathIds: `${user.privateDir.pathIds}/test-file`,
            parentId: user.privateDir.id,
            tenantId: user.tenantId,
          },
        })
        const deletedFile = await prismaClient.fileDescriptor.create({
          data: {
            name: "test-file-deleted",
            mimeType: "text/plain",
            deletedAt: new Date(),
            size: 100,
            birthtime: new Date(),
            blobHash: "dummy-hash",
            parentId: user.privateDir.id,
            mtime: new Date(),
            pathIds: `${user.privateDir.pathIds}/test-file-deleted`,
            tenantId: user.tenantId,
          },
        })

        // Check findMany
        const { data: files } = await fileDescriptorSource.findMany("EntityFileDescriptor", {
          where: { parentId: user.privateDir.id },
        })
        expect(files).toHaveLength(1)
        expect(files[0]?.id).toBe(existFile.id)
        expect(files[0]?.name).toBe(existFile.name)

        // Check findAll
        const allFiles = await fileDescriptorSource.findAll("EntityFileDescriptor", {
          where: { parentId: user.privateDir.id },
        })
        expect(allFiles).toHaveLength(1)
        expect(allFiles[0]?.id).toBe(existFile.id)
        expect(allFiles[0]?.name).toBe(existFile.name)

        // Check find 1
        const foundFile = await fileDescriptorSource.find("EntityFileDescriptor", {
          where: { id: existFile.id },
        })
        expect(foundFile?.id).toBe(existFile.id)
        expect(foundFile?.name).toBe(existFile.name)
        // Check find 2
        const foundFile2 = fileDescriptorSource.find("EntityFileDescriptor", {
          where: { id: deletedFile.id },
        })
        await expect(foundFile2).rejects.throws(NotFoundError)

        // Check findIfExists 1
        const foundFile3 = await fileDescriptorSource.findIfExists("EntityFileDescriptor", {
          where: { id: existFile.id },
        })
        expect(foundFile3?.id).toBe(existFile.id)
        expect(foundFile3?.name).toBe(existFile.name)
        // Check findIfExists 2
        const foundFile4 = await fileDescriptorSource.findIfExists("EntityFileDescriptor", {
          where: { id: deletedFile.id },
        })
        expect(foundFile4).toBeNull()

        // Check count
        const count = await fileDescriptorSource.count({
          where: { parentId: user.privateDir.id },
        })
        expect(count).toBe(1)

        // Check exists 1
        const exists1 = await fileDescriptorSource.exists({
          where: { id: existFile.id },
        })
        expect(exists1).toBe(true)

        // Check exists 2 (deleted record)
        const exists2 = await fileDescriptorSource.exists({
          where: { id: deletedFile.id },
        })
        expect(exists2).toBe(false)
      })
    })
  })
})
