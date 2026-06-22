import { PrismaClient } from "@prisma/client"
import { beforeEach, describe, expect, it } from "vitest"

import { getDiContainer } from "@wr/composition"
import { CoreConfig } from "@wr/core"
import { BadRequestError, NotFoundError, PermissionDeniedError } from "@wr/shared"
import { runWithDiContainer, runWithPrivateContext } from "@wr/shared-node"
import {
  createTestConfigWithTmpFolder,
  createTestPrismaClient,
  testOtherUserId,
  testOtherUserIdTokenAdmin,
  testPrivateOtherUserRootDirId,
  testPrivateUserRootDirId,
  testRootDirId,
  testSharedRootDirId,
  testTenantId,
  testUserId,
  testUserIdTokenAdmin,
} from "@wr/testing"

import { FileAccessContext, FileAccessService } from "../../types"

describe("[Success] FileAccessService", () => {
  const testIdToken = testUserIdTokenAdmin
  let testContainer: ReturnType<typeof getDiContainer>
  let prismaClient: PrismaClient

  beforeEach(async () => {
    testContainer = getDiContainer().createChildContainer()
    prismaClient = await createTestPrismaClient()
    const config = createTestConfigWithTmpFolder()
    testContainer.registerInstance<CoreConfig>("CoreConfig", config)
    testContainer.registerInstance<PrismaClient>("PrismaClient", prismaClient)
    testContainer.registerInstance<FileAccessContext>("FileAccessContext", {
      userId: testUserId,
      showHiddenFiles: false,
    })
  })

  it("Create new file and read its content", async () => {
    await runWithPrivateContext({ idToken: testIdToken }, async () => {
      const fileAccessProvider = testContainer.resolve<FileAccessService>("FileAccessService")
      const text = "Hello, World!"
      const newResult = await runWithPrivateContext({ idToken: testIdToken }, async () => {
        const content = new Uint8Array(new TextEncoder().encode(text)).buffer
        return await fileAccessProvider.writeFileNew({
          content,
          fileName: "test.txt",
          parentDescId: testSharedRootDirId,
          mimeType: "text/plain",
        })
      })

      // Read the file content.
      const readResult = await runWithPrivateContext({ idToken: testIdToken }, async () => {
        return await fileAccessProvider.readFile({ id: newResult.id })
      })

      // Check.
      expect(new TextDecoder().decode(readResult)).toBe(text)
      expect(newResult.isDirectory).toBe(false)
      expect(newResult.isRoot).toBe(false)
      expect(newResult.mimeType).toBe("text/plain")
      expect(newResult.parentId).toBe(testSharedRootDirId)

      // Find the file by text.
      const findResult = await runWithPrivateContext({ idToken: testIdToken }, async () => {
        return await fileAccessProvider.findByText("Hello")
      })
      expect(findResult.files).toHaveLength(1)
      expect(findResult.files[0]?.id).toBe(newResult.id)

      // Find by text that does not exist should throw NotFoundError.
      const notFoundResult = runWithPrivateContext({ idToken: testIdToken }, async () => {
        return await fileAccessProvider.findByText("NotFound")
      })
      await expect(notFoundResult).rejects.toThrow(NotFoundError)
    })
  })

  it("Get file descriptor", async () => {
    await runWithPrivateContext({ idToken: testIdToken }, async () => {
      const fileAccessProvider = testContainer.resolve<FileAccessService>("FileAccessService")
      const existingFileStat = await runWithPrivateContext({ idToken: testIdToken }, async () => {
        return await fileAccessProvider.getDescriptor(testPrivateUserRootDirId)
      })
      expect(existingFileStat.id).toBe(testPrivateUserRootDirId)

      const nonExistingFileStat = runWithPrivateContext({ idToken: testIdToken }, async () => {
        return await fileAccessProvider.getDescriptor("non-existing-file-id")
      })
      await expect(nonExistingFileStat).rejects.toThrow(NotFoundError)
    })
  })

  it("Get stat of the root", async () => {
    await runWithDiContainer(testContainer, async () => {
      const fileAccessProvider = testContainer.resolve<FileAccessService>("FileAccessService")
      const existingFileStat = await runWithPrivateContext({ idToken: testIdToken }, async () => {
        return await fileAccessProvider.rootDescriptor()
      })
      expect(existingFileStat.id).toBe(testRootDirId)
    })
  })

  it("Move a file", async () => {
    await runWithDiContainer(testContainer, async () => {
      const fileAccessProvider = testContainer.resolve<FileAccessService>("FileAccessService")
      const newFile = await runWithPrivateContext({ idToken: testIdToken }, async () => {
        const content = new Uint8Array(new TextEncoder().encode("Test")).buffer
        return await fileAccessProvider.writeFileNew({
          content,
          fileName: "test.txt",
          parentDescId: testSharedRootDirId,
          mimeType: "text/plain",
        })
      })
      const newDir = await runWithPrivateContext({ idToken: testIdToken }, async () => {
        return await fileAccessProvider.makeDirectory({ dirName: "newDir", parentDescId: testSharedRootDirId })
      })

      // Move file into another directory should work.
      const movedFile = await runWithPrivateContext({ idToken: testIdToken }, async () => {
        return await fileAccessProvider.moveFile({ descId: newFile.id, parentDescId: newDir.id })
      })
      expect(movedFile.parentId).toBe(newDir.id)

      // Move file into private directory should work.
      const movedFile2 = await runWithPrivateContext({ idToken: testIdToken }, async () => {
        return await fileAccessProvider.moveFile({ descId: newFile.id, parentDescId: testPrivateUserRootDirId })
      })
      expect(movedFile2.parentId).toBe(testPrivateUserRootDirId)
    })
  })

  it("Move a directory with childrens", async () => {
    await runWithDiContainer(testContainer, async () => {
      const fileAccessProvider = testContainer.resolve<FileAccessService>("FileAccessService")
      const sourceDir = await runWithPrivateContext({ idToken: testIdToken }, async () => {
        return await fileAccessProvider.makeDirectory({ dirName: "sourceDir", parentDescId: testSharedRootDirId })
      })
      const childDir = await runWithPrivateContext({ idToken: testIdToken }, async () => {
        return await fileAccessProvider.makeDirectory({ dirName: "childDir", parentDescId: sourceDir.id })
      })
      const childFileText = "Nested file content"
      const childFile = await runWithPrivateContext({ idToken: testIdToken }, async () => {
        const content = new Uint8Array(new TextEncoder().encode(childFileText)).buffer
        return await fileAccessProvider.writeFileNew({
          content,
          fileName: "nested.txt",
          parentDescId: childDir.id,
          mimeType: "text/plain",
        })
      })
      const targetDir = await runWithPrivateContext({ idToken: testIdToken }, async () => {
        return await fileAccessProvider.makeDirectory({ dirName: "targetDir", parentDescId: testSharedRootDirId })
      })

      const movedDir = await runWithPrivateContext({ idToken: testIdToken }, async () => {
        return await fileAccessProvider.moveFile({ descId: sourceDir.id, parentDescId: targetDir.id })
      })
      expect(movedDir.parentId).toBe(targetDir.id)

      const movedChildPath = await runWithPrivateContext({ idToken: testIdToken }, async () => {
        return await fileAccessProvider.buildReadablePath(childFile.id)
      })
      expect(movedChildPath).toContain("/targetDir/sourceDir/childDir/nested.txt")

      const movedChildContent = await runWithPrivateContext({ idToken: testIdToken }, async () => {
        return await fileAccessProvider.readFile({ id: childFile.id })
      })
      expect(new TextDecoder().decode(movedChildContent)).toBe(childFileText)

      const movedChildren = await runWithPrivateContext({ idToken: testIdToken }, async () => {
        return await fileAccessProvider.list({ descId: movedDir.id, page: 0, take: 10 })
      })
      expect(movedChildren.data).toHaveLength(1)
      expect(movedChildren.data[0]?.id).toBe(childDir.id)
    })
  })

  it("Copy a file", async () => {
    await runWithDiContainer(testContainer, async () => {
      const fileAccessService = testContainer.resolve<FileAccessService>("FileAccessService")

      const originalText = "Copy me"
      const originalFile = await runWithPrivateContext({ idToken: testIdToken }, async () => {
        const content = new Uint8Array(new TextEncoder().encode(originalText)).buffer
        return await fileAccessService.writeFileNew({
          content,
          fileName: "original.txt",
          parentDescId: testSharedRootDirId,
          mimeType: "text/plain",
        })
      })

      // Copy with default name (adds "_copy" suffix).
      const copiedFile = await runWithPrivateContext({ idToken: testIdToken }, async () => {
        return await fileAccessService.copyFile({ descId: originalFile.id })
      })
      expect(copiedFile.id).not.toBe(originalFile.id)
      expect(copiedFile.parentId).toBe(testSharedRootDirId)
      expect(copiedFile.name).toBe("original_copy.txt")

      const copiedContent = await runWithPrivateContext({ idToken: testIdToken }, async () => {
        return await fileAccessService.readFile({ id: copiedFile.id })
      })
      expect(new TextDecoder().decode(copiedContent)).toBe(originalText)

      // Copy with custom name.
      const namedCopy = await runWithPrivateContext({ idToken: testIdToken }, async () => {
        return await fileAccessService.copyFile({ descId: originalFile.id, newName: "renamed-copy.txt" })
      })
      expect(namedCopy.id).not.toBe(originalFile.id)
      expect(namedCopy.parentId).toBe(testSharedRootDirId)
      expect(namedCopy.name).toBe("renamed-copy.txt")
    })
  })

  it("Delete a file", async () => {
    await runWithDiContainer(testContainer, async () => {
      const fileAccessProvider = testContainer.resolve<FileAccessService>("FileAccessService")
      const targetFile = await runWithPrivateContext({ idToken: testIdToken }, async () => {
        const content = new Uint8Array(new TextEncoder().encode("Delete me")).buffer
        return await fileAccessProvider.writeFileNew({
          content,
          fileName: "delete-me.txt",
          parentDescId: testSharedRootDirId,
          mimeType: "text/plain",
        })
      })

      await runWithPrivateContext({ idToken: testIdToken }, async () => {
        await fileAccessProvider.deleteMany({ ids: [targetFile.id] })
      })

      const deletedFile = runWithPrivateContext({ idToken: testIdToken }, async () => {
        return await fileAccessProvider.getDescriptor(targetFile.id)
      })
      await expect(deletedFile).rejects.toThrow(NotFoundError)
    })
  })

  it("Delete a directory with childrens", async () => {
    await runWithDiContainer(testContainer, async () => {
      const fileAccessProvider = testContainer.resolve<FileAccessService>("FileAccessService")
      const sourceDir = await runWithPrivateContext({ idToken: testIdToken }, async () => {
        return await fileAccessProvider.makeDirectory({ dirName: "delete-source-dir", parentDescId: testSharedRootDirId })
      })
      const childDir = await runWithPrivateContext({ idToken: testIdToken }, async () => {
        return await fileAccessProvider.makeDirectory({ dirName: "delete-child-dir", parentDescId: sourceDir.id })
      })
      const childFile = await runWithPrivateContext({ idToken: testIdToken }, async () => {
        const content = new Uint8Array(new TextEncoder().encode("Delete nested file")).buffer
        return await fileAccessProvider.writeFileNew({
          content,
          fileName: "delete-nested.txt",
          parentDescId: childDir.id,
          mimeType: "text/plain",
        })
      })

      await runWithPrivateContext({ idToken: testIdToken }, async () => {
        await fileAccessProvider.deleteMany({ ids: [sourceDir.id] })
      })

      const deletedSourceDir = runWithPrivateContext({ idToken: testIdToken }, async () => {
        return await fileAccessProvider.getDescriptor(sourceDir.id)
      })
      await expect(deletedSourceDir).rejects.toThrow(NotFoundError)

      const deletedChildDir = runWithPrivateContext({ idToken: testIdToken }, async () => {
        return await fileAccessProvider.getDescriptor(childDir.id)
      })
      await expect(deletedChildDir).rejects.toThrow(NotFoundError)

      const deletedChildFile = runWithPrivateContext({ idToken: testIdToken }, async () => {
        return await fileAccessProvider.getDescriptor(childFile.id)
      })
      await expect(deletedChildFile).rejects.toThrow(NotFoundError)

      const sharedChildren = await runWithPrivateContext({ idToken: testIdToken }, async () => {
        return await fileAccessProvider.list({ descId: testSharedRootDirId, page: 0, take: 20 })
      })
      expect(sharedChildren.data.find((desc) => desc.id === sourceDir.id)).toBeUndefined()
    })
  })

  it("List a files and folders", async () => {
    await runWithDiContainer(testContainer, async () => {
      const fileAccessProvider = testContainer.resolve<FileAccessService>("FileAccessService")
      const parentDir = await runWithPrivateContext({ idToken: testIdToken }, async () => {
        return await fileAccessProvider.list({ descId: testRootDirId })
      })
      expect(parentDir.data).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ id: testPrivateUserRootDirId }),
          expect.objectContaining({ id: testSharedRootDirId }),
        ])
      )
      expect(parentDir.data).not.toEqual(
        expect.arrayContaining([
          // Not containing other user's private root dir.
          expect.objectContaining({ id: testPrivateOtherUserRootDirId }),
        ])
      )
    })
  })

  it("Can list ancestor directory of accessible directory", async () => {
    // "Other user" who has access to root -> shared -> targetDir, should be able to list the ancestor directories, but can not write or delete files in those ancestor directories.
    // Also, "other user" can not see root -> common because it is not an ancestor of the accessible directory.

    // Preare directory structure: root -> shared -> targetDir as an owner.
    const [sharedDirId, targetDirId, commonDirId] = await runWithDiContainer(testContainer, async () => {
      const fileAccessProvider = testContainer.resolve<FileAccessService>("FileAccessService")
      return await runWithPrivateContext({ idToken: testIdToken }, async () => {
        const sharedDir = await fileAccessProvider.makeDirectory({ parentDescId: testRootDirId, dirName: "shared" })
        const targetDir = await fileAccessProvider.makeDirectory({ parentDescId: sharedDir.id, dirName: "targetDir" })
        const commonDir = await fileAccessProvider.makeDirectory({ parentDescId: testRootDirId, dirName: "common" })

        // Create an access group and participate the "other user" in that group.
        await prismaClient.accessGroup.create({
          data: {
            name: "Test Access Group",
            description: "A test access group for unit testing.",
            tenantId: testTenantId,
            read: true,
            write: true,
            users: {
              connect: { id: testOtherUserId },
            },
            resources: {
              connect: { id: targetDir.id },
            },
          },
        })
        return [sharedDir.id, targetDir.id, commonDir.id]
      })
    })

    // Override fileAccessContext to simulate "other user" and list the ancestor directories.
    testContainer.registerInstance<FileAccessContext>("FileAccessContext", {
      userId: testOtherUserId,
      showHiddenFiles: false,
    })
    await runWithDiContainer(testContainer, async () => {
      // Run as "other user" to list the ancestor directories.
      const fileAccessProvider = testContainer.resolve<FileAccessService>("FileAccessService")
      await runWithPrivateContext({ idToken: testOtherUserIdTokenAdmin }, async () => {
        // This should contain the sharedDir but not the commonDir.
        const { data: listRootDir } = await fileAccessProvider.list({ descId: testRootDirId })
        expect(listRootDir.find((desc) => desc.id === sharedDirId)).toBeDefined()
        expect(listRootDir.find((desc) => desc.id === commonDirId)).toBeUndefined()
        expect(listRootDir.find((desc) => desc.id === testPrivateOtherUserRootDirId)).toBeDefined()
        expect(listRootDir.find((desc) => desc.id === testPrivateUserRootDirId)).toBeUndefined()

        const sharedFolderDeleteResult = fileAccessProvider.deleteMany({ ids: [sharedDirId] })
        const commonFolderDeleteResult = fileAccessProvider.deleteMany({ ids: [commonDirId] })
        const targetFolderDeleteResult = fileAccessProvider.deleteMany({ ids: [targetDirId] })
        await expect(sharedFolderDeleteResult).rejects.toThrow(PermissionDeniedError)
        await expect(commonFolderDeleteResult).rejects.toThrow(PermissionDeniedError)
        await expect(targetFolderDeleteResult).resolves.not.toThrow()
      })
    })
  })
})

describe("[Failure] FileAccessService", () => {
  const testIdToken = testUserIdTokenAdmin
  let testContainer: ReturnType<typeof getDiContainer>
  let prismaClient: PrismaClient

  beforeEach(async () => {
    testContainer = getDiContainer().createChildContainer()
    prismaClient = await createTestPrismaClient()
    const config = createTestConfigWithTmpFolder()
    testContainer.registerInstance<CoreConfig>("CoreConfig", config)
    testContainer.registerInstance<PrismaClient>("PrismaClient", prismaClient)
    testContainer.registerInstance<FileAccessContext>("FileAccessContext", {
      userId: testUserId,
      showHiddenFiles: false,
    })
  })

  it("Fail to remove other user's private file", async () => {
    await runWithDiContainer(testContainer, async () => {
      const fileAccessProvider = testContainer.resolve<FileAccessService>("FileAccessService")
      const targetFile = await prismaClient.fileDescriptor.create({
        data: {
          id: "other-user-private-file-id",
          name: "secret.txt",
          birthtime: new Date(),
          mtime: new Date(),
          isRoot: false,
          isDirectory: false,
          parentId: testPrivateOtherUserRootDirId,
          pathIds: `/${testRootDirId}/${testPrivateOtherUserRootDirId}/other-user-private-file-id`,
          mimeType: "text/plain",
          size: 7,
          blobHash: "other-user-private-file-blob-hash",
          tenantId: testTenantId,
        },
      })

      const deleteResult = runWithPrivateContext({ idToken: testIdToken }, async () => {
        await fileAccessProvider.deleteMany({ ids: [targetFile.id] })
      })
      await expect(deleteResult).rejects.toThrow(PermissionDeniedError)

      const existingFile = await prismaClient.fileDescriptor.findUnique({ where: { id: targetFile.id } })
      expect(existingFile?.deletedAt).toBeNull()
    })
  })

  it("Fail to move file to other user's private directory", async () => {
    await runWithDiContainer(testContainer, async () => {
      const fileAccessProvider = testContainer.resolve<FileAccessService>("FileAccessService")
      const targetFile = await runWithPrivateContext({ idToken: testIdToken }, async () => {
        const content = new Uint8Array(new TextEncoder().encode("Move me")).buffer
        return await fileAccessProvider.writeFileNew({
          content,
          fileName: "move-me.txt",
          parentDescId: testSharedRootDirId,
          mimeType: "text/plain",
        })
      })

      const moveResult = runWithPrivateContext({ idToken: testIdToken }, async () => {
        return await fileAccessProvider.moveFile({
          descId: targetFile.id,
          parentDescId: testPrivateOtherUserRootDirId,
        })
      })
      await expect(moveResult).rejects.toThrow(PermissionDeniedError)

      const unchangedFile = await runWithPrivateContext({ idToken: testIdToken }, async () => {
        return await fileAccessProvider.getDescriptor(targetFile.id)
      })
      expect(unchangedFile.parentId).toBe(testSharedRootDirId)
    })
  })

  it("Fail to move a directory into its own descendant", async () => {
    await runWithDiContainer(testContainer, async () => {
      const fileAccessService = testContainer.resolve<FileAccessService>("FileAccessService")

      const parentDir = await runWithPrivateContext({ idToken: testIdToken }, async () => {
        return await fileAccessService.makeDirectory({ dirName: "ancestor-dir", parentDescId: testSharedRootDirId })
      })
      const childDir = await runWithPrivateContext({ idToken: testIdToken }, async () => {
        return await fileAccessService.makeDirectory({ dirName: "child-dir", parentDescId: parentDir.id })
      })
      const grandChildDir = await runWithPrivateContext({ idToken: testIdToken }, async () => {
        return await fileAccessService.makeDirectory({ dirName: "grandchild-dir", parentDescId: childDir.id })
      })

      // Moving a directory into its direct child should fail.
      const moveIntoChild = runWithPrivateContext({ idToken: testIdToken }, async () => {
        return await fileAccessService.moveFile({ descId: parentDir.id, parentDescId: childDir.id })
      })
      await expect(moveIntoChild).rejects.toThrow(BadRequestError)

      // Moving a directory into its grandchild should also fail.
      const moveIntoGrandchild = runWithPrivateContext({ idToken: testIdToken }, async () => {
        return await fileAccessService.moveFile({ descId: parentDir.id, parentDescId: grandChildDir.id })
      })
      await expect(moveIntoGrandchild).rejects.toThrow(BadRequestError)

      // Verify the directory is unchanged.
      const unchangedDir = await runWithPrivateContext({ idToken: testIdToken }, async () => {
        return await fileAccessService.getDescriptor(parentDir.id)
      })
      expect(unchangedDir.parentId).toBe(testSharedRootDirId)
    })
  })

  it("Fail to copy a own directory", async () => {
    await runWithDiContainer(testContainer, async () => {
      // Copy directory is prohibited to prevent potential abuse of storage by creating many copies of large directories.
      const fileAccessService = testContainer.resolve<FileAccessService>("FileAccessService")

      const dir = await runWithPrivateContext({ idToken: testIdToken }, async () => {
        return await fileAccessService.makeDirectory({ dirName: "copy-dir-test", parentDescId: testSharedRootDirId })
      })

      const copyResult = runWithPrivateContext({ idToken: testIdToken }, async () => {
        return await fileAccessService.copyFile({ descId: dir.id })
      })
      await expect(copyResult).rejects.toThrow(BadRequestError)
    })
  })

  it("Fail to list files of not permitted directory", async () => {
    await runWithDiContainer(testContainer, async () => {
      const fileAccessProvider = testContainer.resolve<FileAccessService>("FileAccessService")
      const listResult = runWithPrivateContext({ idToken: testIdToken }, async () => {
        return await fileAccessProvider.list({ descId: testPrivateOtherUserRootDirId, page: 0, take: 10 })
      })
      await expect(listResult).rejects.toThrow(PermissionDeniedError)
    })
  })

  it("Can not access other user's private directory even if user has access policy to ancestor folder", async () => {
    await runWithDiContainer(testContainer, async () => {
      const fileAccessService = testContainer.resolve<FileAccessService>("FileAccessService")
      const dirList = await runWithPrivateContext({ idToken: testIdToken }, async () => {
        return await fileAccessService.list({ descId: testRootDirId })
      })

      // Check directory list does not contain other user's private directory.
      const ownPrivateDir = dirList.data.find((desc) => desc.id === testPrivateUserRootDirId)
      expect(ownPrivateDir).toBeDefined()

      const sharedDir = dirList.data.find((desc) => desc.id === testSharedRootDirId)
      expect(sharedDir).toBeDefined()

      const otherUserPrivateDir = dirList.data.find((desc) => desc.id === testPrivateOtherUserRootDirId)
      expect(otherUserPrivateDir).toBeUndefined()
    })
  })
})
