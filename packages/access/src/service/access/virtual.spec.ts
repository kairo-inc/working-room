import { PrismaClient } from "@prisma/client"
import { afterEach, beforeEach, describe, expect, it } from "vitest"

import { getDiContainer } from "@wr/composition"
import { CoreConfig } from "@wr/core"
import { BadRequestError, NotFoundError, PermissionDeniedError } from "@wr/shared"
import { runWithDiContainer, runWithPrivateContext } from "@wr/shared-node"
import { fixtureFactory } from "@wr/testing"

import { FileAccessContext, FileAccessService } from "../../types"

describe("[Success] FileAccessService", () => {
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

  it("Create new file and read its content", async () => {
    const { user, dirs } = await fixtureFactory.createTenantWithOwner()
    testContainer.registerInstance<FileAccessContext>("FileAccessContext", { userId: user.id })
    await runWithDiContainer(testContainer, async () => {
      await runWithPrivateContext({ idToken: user.idToken }, async () => {
        const fileAccessProvider = testContainer.resolve<FileAccessService>("FileAccessService")
        const text = "Hello, World!"
        const newResult = await runWithPrivateContext({ idToken: user.idToken }, async () => {
          const content = new Uint8Array(new TextEncoder().encode(text)).buffer
          return await fileAccessProvider.writeFileNew({
            content,
            fileName: "test.txt",
            parentDescId: dirs.sharedRoot.id,
            mimeType: "text/plain",
          })
        })

        // Read the file content.
        const readResult = await runWithPrivateContext({ idToken: user.idToken }, async () => {
          return await fileAccessProvider.readFile({ id: newResult.id })
        })

        // Check.
        expect(new TextDecoder().decode(readResult)).toBe(text)
        expect(newResult.isDirectory).toBe(false)
        expect(newResult.isRoot).toBe(false)
        expect(newResult.mimeType).toBe("text/plain")
        expect(newResult.parentId).toBe(dirs.sharedRoot.id)

        // Find the file by text.
        const findResult = await runWithPrivateContext({ idToken: user.idToken }, async () => {
          return await fileAccessProvider.findByText("Hello")
        })
        expect(findResult.files).toHaveLength(1)
        expect(findResult.files[0]?.id).toBe(newResult.id)

        // Find by text that does not exist should throw NotFoundError.
        const notFoundResult = runWithPrivateContext({ idToken: user.idToken }, async () => {
          return await fileAccessProvider.findByText("NotFound")
        })
        await expect(notFoundResult).rejects.toThrow(NotFoundError)
      })
    })
  })

  it("Get file descriptor", async () => {
    const { user } = await fixtureFactory.createTenantWithOwner()
    testContainer.registerInstance<FileAccessContext>("FileAccessContext", { userId: user.id })
    await runWithDiContainer(testContainer, async () => {
      await runWithPrivateContext({ idToken: user.idToken }, async () => {
        const fileAccessProvider = testContainer.resolve<FileAccessService>("FileAccessService")
        const existingFileStat = await runWithPrivateContext({ idToken: user.idToken }, async () => {
          return await fileAccessProvider.getDescriptor(user.privateDir.id)
        })
        expect(existingFileStat.id).toBe(user.privateDir.id)

        const nonExistingFileStat = runWithPrivateContext({ idToken: user.idToken }, async () => {
          return await fileAccessProvider.getDescriptor("non-existing-file-id")
        })
        await expect(nonExistingFileStat).rejects.toThrow(NotFoundError)
      })
    })
  })

  it("Get stat of the root", async () => {
    const { user, dirs } = await fixtureFactory.createTenantWithOwner()
    testContainer.registerInstance<FileAccessContext>("FileAccessContext", { userId: user.id })
    await runWithDiContainer(testContainer, async () => {
      await runWithDiContainer(testContainer, async () => {
        const fileAccessProvider = testContainer.resolve<FileAccessService>("FileAccessService")
        const existingFileStat = await runWithPrivateContext({ idToken: user.idToken }, async () => {
          return await fileAccessProvider.rootDescriptor()
        })
        expect(existingFileStat.id).toBe(dirs.root.id)
      })
    })
  })

  it("Move a file", async () => {
    const { user, dirs } = await fixtureFactory.createTenantWithOwner()
    testContainer.registerInstance<FileAccessContext>("FileAccessContext", { userId: user.id })
    await runWithDiContainer(testContainer, async () => {
      await runWithDiContainer(testContainer, async () => {
        const fileAccessProvider = testContainer.resolve<FileAccessService>("FileAccessService")
        const newFile = await runWithPrivateContext({ idToken: user.idToken }, async () => {
          const content = new Uint8Array(new TextEncoder().encode("Test")).buffer
          return await fileAccessProvider.writeFileNew({
            content,
            fileName: "test.txt",
            parentDescId: dirs.sharedRoot.id,
            mimeType: "text/plain",
          })
        })
        const newDir = await runWithPrivateContext({ idToken: user.idToken }, async () => {
          return await fileAccessProvider.makeDirectory({ dirName: "newDir", parentDescId: dirs.sharedRoot.id })
        })

        // Move file into another directory should work.
        const movedFile = await runWithPrivateContext({ idToken: user.idToken }, async () => {
          return await fileAccessProvider.moveFile({ descId: newFile.id, parentDescId: newDir.id })
        })
        expect(movedFile.parentId).toBe(newDir.id)

        // Move file into private directory should work.
        const movedFile2 = await runWithPrivateContext({ idToken: user.idToken }, async () => {
          return await fileAccessProvider.moveFile({ descId: newFile.id, parentDescId: user.privateDir.id })
        })
        expect(movedFile2.parentId).toBe(user.privateDir.id)
      })
    })
  })

  it("Move a directory with childrens", async () => {
    const { user, dirs } = await fixtureFactory.createTenantWithOwner()
    testContainer.registerInstance<FileAccessContext>("FileAccessContext", { userId: user.id })
    await runWithDiContainer(testContainer, async () => {
      const fileAccessProvider = testContainer.resolve<FileAccessService>("FileAccessService")
      const sourceDir = await runWithPrivateContext({ idToken: user.idToken }, async () => {
        return await fileAccessProvider.makeDirectory({ dirName: "sourceDir", parentDescId: dirs.sharedRoot.id })
      })
      const childDir = await runWithPrivateContext({ idToken: user.idToken }, async () => {
        return await fileAccessProvider.makeDirectory({ dirName: "childDir", parentDescId: sourceDir.id })
      })
      const childFileText = "Nested file content"
      const childFile = await runWithPrivateContext({ idToken: user.idToken }, async () => {
        const content = new Uint8Array(new TextEncoder().encode(childFileText)).buffer
        return await fileAccessProvider.writeFileNew({
          content,
          fileName: "nested.txt",
          parentDescId: childDir.id,
          mimeType: "text/plain",
        })
      })
      const targetDir = await runWithPrivateContext({ idToken: user.idToken }, async () => {
        return await fileAccessProvider.makeDirectory({ dirName: "targetDir", parentDescId: dirs.sharedRoot.id })
      })

      const movedDir = await runWithPrivateContext({ idToken: user.idToken }, async () => {
        return await fileAccessProvider.moveFile({ descId: sourceDir.id, parentDescId: targetDir.id })
      })
      expect(movedDir.parentId).toBe(targetDir.id)

      const movedChildPath = await runWithPrivateContext({ idToken: user.idToken }, async () => {
        return await fileAccessProvider.buildReadablePath(childFile.id)
      })
      expect(movedChildPath).toContain("/targetDir/sourceDir/childDir/nested.txt")

      const movedChildContent = await runWithPrivateContext({ idToken: user.idToken }, async () => {
        return await fileAccessProvider.readFile({ id: childFile.id })
      })
      expect(new TextDecoder().decode(movedChildContent)).toBe(childFileText)

      const movedChildren = await runWithPrivateContext({ idToken: user.idToken }, async () => {
        return await fileAccessProvider.list({ descId: movedDir.id, page: 0, take: 10 })
      })
      expect(movedChildren.data).toHaveLength(1)
      expect(movedChildren.data[0]?.id).toBe(childDir.id)
    })
  })

  it("Copy a file", async () => {
    const { user, dirs } = await fixtureFactory.createTenantWithOwner()
    testContainer.registerInstance<FileAccessContext>("FileAccessContext", { userId: user.id })
    await runWithDiContainer(testContainer, async () => {
      const fileAccessService = testContainer.resolve<FileAccessService>("FileAccessService")
      const originalText = "Copy me"
      const originalFile = await runWithPrivateContext({ idToken: user.idToken }, async () => {
        const content = new Uint8Array(new TextEncoder().encode(originalText)).buffer
        return await fileAccessService.writeFileNew({
          content,
          fileName: "original.txt",
          parentDescId: dirs.sharedRoot.id,
          mimeType: "text/plain",
        })
      })

      // Copy with default name (adds "_copy" suffix).
      const copiedFile = await runWithPrivateContext({ idToken: user.idToken }, async () => {
        return await fileAccessService.copyFile({ descId: originalFile.id })
      })
      expect(copiedFile.id).not.toBe(originalFile.id)
      expect(copiedFile.parentId).toBe(dirs.sharedRoot.id)
      expect(copiedFile.name).toBe("original_copy.txt")

      const copiedContent = await runWithPrivateContext({ idToken: user.idToken }, async () => {
        return await fileAccessService.readFile({ id: copiedFile.id })
      })
      expect(new TextDecoder().decode(copiedContent)).toBe(originalText)

      // Copy with custom name.
      const namedCopy = await runWithPrivateContext({ idToken: user.idToken }, async () => {
        return await fileAccessService.copyFile({ descId: originalFile.id, newName: "renamed-copy.txt" })
      })
      expect(namedCopy.id).not.toBe(originalFile.id)
      expect(namedCopy.parentId).toBe(dirs.sharedRoot.id)
      expect(namedCopy.name).toBe("renamed-copy.txt")
    })
  })

  it("Delete a file", async () => {
    const { user, dirs } = await fixtureFactory.createTenantWithOwner()
    testContainer.registerInstance<FileAccessContext>("FileAccessContext", { userId: user.id })
    await runWithDiContainer(testContainer, async () => {
      const fileAccessProvider = testContainer.resolve<FileAccessService>("FileAccessService")
      const targetFile = await runWithPrivateContext({ idToken: user.idToken }, async () => {
        const content = new Uint8Array(new TextEncoder().encode("Delete me")).buffer
        return await fileAccessProvider.writeFileNew({
          content,
          fileName: "delete-me.txt",
          parentDescId: dirs.sharedRoot.id,
          mimeType: "text/plain",
        })
      })

      await runWithPrivateContext({ idToken: user.idToken }, async () => {
        await fileAccessProvider.deleteMany({ ids: [targetFile.id] })
      })

      const deletedFile = runWithPrivateContext({ idToken: user.idToken }, async () => {
        return await fileAccessProvider.getDescriptor(targetFile.id)
      })
      await expect(deletedFile).rejects.toThrow(NotFoundError)
    })
  })

  it("Delete a directory with childrens", async () => {
    const { user, dirs } = await fixtureFactory.createTenantWithOwner()
    testContainer.registerInstance<FileAccessContext>("FileAccessContext", { userId: user.id })
    await runWithDiContainer(testContainer, async () => {
      const fileAccessProvider = testContainer.resolve<FileAccessService>("FileAccessService")
      const sourceDir = await runWithPrivateContext({ idToken: user.idToken }, async () => {
        return await fileAccessProvider.makeDirectory({ dirName: "delete-source-dir", parentDescId: dirs.sharedRoot.id })
      })
      const childDir = await runWithPrivateContext({ idToken: user.idToken }, async () => {
        return await fileAccessProvider.makeDirectory({ dirName: "delete-child-dir", parentDescId: sourceDir.id })
      })
      const childFile = await runWithPrivateContext({ idToken: user.idToken }, async () => {
        const content = new Uint8Array(new TextEncoder().encode("Delete nested file")).buffer
        return await fileAccessProvider.writeFileNew({
          content,
          fileName: "delete-nested.txt",
          parentDescId: childDir.id,
          mimeType: "text/plain",
        })
      })

      await runWithPrivateContext({ idToken: user.idToken }, async () => {
        await fileAccessProvider.deleteMany({ ids: [sourceDir.id] })
      })

      const deletedSourceDir = runWithPrivateContext({ idToken: user.idToken }, async () => {
        return await fileAccessProvider.getDescriptor(sourceDir.id)
      })
      await expect(deletedSourceDir).rejects.toThrow(NotFoundError)

      const deletedChildDir = runWithPrivateContext({ idToken: user.idToken }, async () => {
        return await fileAccessProvider.getDescriptor(childDir.id)
      })
      await expect(deletedChildDir).rejects.toThrow(NotFoundError)

      const deletedChildFile = runWithPrivateContext({ idToken: user.idToken }, async () => {
        return await fileAccessProvider.getDescriptor(childFile.id)
      })
      await expect(deletedChildFile).rejects.toThrow(NotFoundError)

      const sharedChildren = await runWithPrivateContext({ idToken: user.idToken }, async () => {
        return await fileAccessProvider.list({ descId: dirs.sharedRoot.id, page: 0, take: 20 })
      })
      expect(sharedChildren.data.find((desc) => desc.id === sourceDir.id)).toBeUndefined()
    })
  })

  it("List a files and folders", async () => {
    const { user, dirs, adminUser, memberUser } = await fixtureFactory.createTenantWithOwnerAndOtherUsers()
    testContainer.registerInstance<FileAccessContext>("FileAccessContext", { userId: user.id })
    await runWithDiContainer(testContainer, async () => {
      const fileAccessProvider = testContainer.resolve<FileAccessService>("FileAccessService")
      const parentDir = await runWithPrivateContext({ idToken: user.idToken }, async () => {
        return await fileAccessProvider.list({ descId: dirs.root.id })
      })
      expect(parentDir.data).toEqual(
        expect.arrayContaining([expect.objectContaining({ id: user.privateDir.id }), expect.objectContaining({ id: dirs.sharedRoot.id })])
      )
      expect(parentDir.data).not.toEqual(
        expect.arrayContaining([
          // Not containing other user's private root dir.
          expect.objectContaining({ id: memberUser.privateDir.id }),
        ])
      )
      expect(parentDir.data).not.toEqual(
        expect.arrayContaining([
          // Not containing other user's private root dir.
          expect.objectContaining({ id: adminUser.privateDir.id }),
        ])
      )
    })
  })

  it("Can list ancestor directory of accessible directory", async () => {
    // "Other user" who has access to root -> shared -> targetDir, should be able to list the ancestor directories, but can not write or delete files in those ancestor directories.
    // Also, "other user" can not see root -> common because it is not an ancestor of the accessible directory.
    // Preare directory structure: root -> shared -> targetDir as an owner.
    const { tenant, user, dirs, memberUser } = await fixtureFactory.createTenantWithOwnerAndOtherUsers()
    testContainer.registerInstance<FileAccessContext>("FileAccessContext", { userId: user.id })
    const [sharedDirId, targetDirId, commonDirId] = await runWithDiContainer(testContainer, async () => {
      const fileAccessProvider = testContainer.resolve<FileAccessService>("FileAccessService")
      return await runWithPrivateContext({ idToken: user.idToken }, async () => {
        const sharedDir = await fileAccessProvider.makeDirectory({ parentDescId: dirs.root.id, dirName: "shared" })
        const commonDir = await fileAccessProvider.makeDirectory({ parentDescId: dirs.root.id, dirName: "common" })
        const targetDir = await fileAccessProvider.makeDirectory({ parentDescId: sharedDir.id, dirName: "targetDir" })

        // Create an access group and participate the "other user" in that group.
        await prismaClient.accessGroup.create({
          data: {
            name: "Test Access Group",
            description: "A test access group for unit testing.",
            tenantId: tenant.id,
            read: true,
            write: true,
            users: {
              connect: { id: memberUser.id },
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
    testContainer.registerInstance<FileAccessContext>("FileAccessContext", { userId: memberUser.id })
    await runWithDiContainer(testContainer, async () => {
      // Run as "other user" to list the ancestor directories.
      const fileAccessProvider = testContainer.resolve<FileAccessService>("FileAccessService")
      await runWithPrivateContext({ idToken: memberUser.idToken }, async () => {
        // This should contain the sharedDir but not the commonDir.
        const { data: listRootDir } = await fileAccessProvider.list({ descId: dirs.root.id })

        expect(listRootDir.find((desc) => desc.id === sharedDirId)).toBeDefined()
        expect(listRootDir.find((desc) => desc.id === commonDirId)).toBeUndefined()
        expect(listRootDir.find((desc) => desc.id === memberUser.privateDir.id)).toBeDefined()
        expect(listRootDir.find((desc) => desc.id === user.privateDir.id)).toBeUndefined()

        await expect(fileAccessProvider.deleteMany({ ids: [sharedDirId] })).rejects.toThrow(PermissionDeniedError)
        await expect(fileAccessProvider.deleteMany({ ids: [commonDirId] })).rejects.toThrow(PermissionDeniedError)
        await expect(fileAccessProvider.deleteMany({ ids: [targetDirId] })).resolves.not.toThrow()
      })
    })
  })

  it("Traverse a directory", async () => {
    const { user, dirs } = await fixtureFactory.createTenantWithOwner()
    testContainer.registerInstance<FileAccessContext>("FileAccessContext", { userId: user.id })
    await runWithDiContainer(testContainer, async () => {
      const fileAccessProvider = testContainer.resolve<FileAccessService>("FileAccessService")
      const parentDir = await runWithPrivateContext({ idToken: user.idToken }, async () => {
        return await fileAccessProvider.makeDirectory({ dirName: "traverse-parent", parentDescId: dirs.sharedRoot.id })
      })
      const childDir = await runWithPrivateContext({ idToken: user.idToken }, async () => {
        return await fileAccessProvider.makeDirectory({ dirName: "traverse-child", parentDescId: parentDir.id })
      })
      const childFileText = "Traverse me"
      const childFile = await runWithPrivateContext({ idToken: user.idToken }, async () => {
        const content = new Uint8Array(new TextEncoder().encode(childFileText)).buffer
        return await fileAccessProvider.writeFileNew({
          content,
          fileName: "traverse-nested.txt",
          parentDescId: childDir.id,
          mimeType: "text/plain",
        })
      })

      const traversedFiles = await runWithPrivateContext({ idToken: user.idToken }, async () => {
        return await fileAccessProvider.traverse({ descId: parentDir.id, maxDepth: 1 })
      })
      expect(traversedFiles.find((desc) => desc.id === childDir.id)).toBeDefined()
      expect(traversedFiles.find((desc) => desc.id === childFile.id)).toBeDefined()

      const traversedSubDir = await runWithPrivateContext({ idToken: user.idToken }, async () => {
        return await fileAccessProvider.traverse({ descId: parentDir.id, maxDepth: 0 })
      })
      expect(traversedSubDir.find((desc) => desc.id === childDir.id)).toBeDefined()
      expect(traversedSubDir.find((desc) => desc.id === childFile.id)).toBeUndefined()
    })
  })
})

describe("[Failure] FileAccessService", () => {
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

  it("Fail to remove other user's private file", async () => {
    const { tenant, user, dirs, memberUser } = await fixtureFactory.createTenantWithOwnerAndOtherUsers()
    testContainer.registerInstance<FileAccessContext>("FileAccessContext", { userId: user.id })
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
          parentId: memberUser.privateDir.id,
          pathIds: `/${dirs.root.id}/${memberUser.privateDir.id}/other-user-private-file-id`,
          mimeType: "text/plain",
          size: 7,
          blobHash: "other-user-private-file-blob-hash",
          tenantId: tenant.id,
        },
      })

      const deleteResult = runWithPrivateContext({ idToken: user.idToken }, async () => {
        await fileAccessProvider.deleteMany({ ids: [targetFile.id] })
      })
      await expect(deleteResult).rejects.toThrow(PermissionDeniedError)

      const existingFile = await prismaClient.fileDescriptor.findUnique({ where: { id: targetFile.id } })
      expect(existingFile?.deletedAt).toBeNull()
    })
  })

  it("Fail to move file to other user's private directory", async () => {
    const { user, dirs, memberUser } = await fixtureFactory.createTenantWithOwnerAndOtherUsers()
    testContainer.registerInstance<FileAccessContext>("FileAccessContext", { userId: user.id })
    await runWithDiContainer(testContainer, async () => {
      const fileAccessProvider = testContainer.resolve<FileAccessService>("FileAccessService")
      const targetFile = await runWithPrivateContext({ idToken: user.idToken }, async () => {
        const content = new Uint8Array(new TextEncoder().encode("Move me")).buffer
        return await fileAccessProvider.writeFileNew({
          content,
          fileName: "move-me.txt",
          parentDescId: dirs.sharedRoot.id,
          mimeType: "text/plain",
        })
      })

      const moveResult = runWithPrivateContext({ idToken: user.idToken }, async () => {
        return await fileAccessProvider.moveFile({
          descId: targetFile.id,
          parentDescId: memberUser.privateDir.id,
        })
      })
      await expect(moveResult).rejects.toThrow(PermissionDeniedError)

      const unchangedFile = await runWithPrivateContext({ idToken: user.idToken }, async () => {
        return await fileAccessProvider.getDescriptor(targetFile.id)
      })
      expect(unchangedFile.parentId).toBe(dirs.sharedRoot.id)
    })
  })

  it("Fail to move a directory into its own descendant", async () => {
    const { user, dirs } = await fixtureFactory.createTenantWithOwner()
    testContainer.registerInstance<FileAccessContext>("FileAccessContext", { userId: user.id })
    await runWithDiContainer(testContainer, async () => {
      const fileAccessService = testContainer.resolve<FileAccessService>("FileAccessService")

      const parentDir = await runWithPrivateContext({ idToken: user.idToken }, async () => {
        return await fileAccessService.makeDirectory({ dirName: "ancestor-dir", parentDescId: dirs.sharedRoot.id })
      })
      const childDir = await runWithPrivateContext({ idToken: user.idToken }, async () => {
        return await fileAccessService.makeDirectory({ dirName: "child-dir", parentDescId: parentDir.id })
      })
      const grandChildDir = await runWithPrivateContext({ idToken: user.idToken }, async () => {
        return await fileAccessService.makeDirectory({ dirName: "grandchild-dir", parentDescId: childDir.id })
      })

      // Moving a directory into its direct child should fail.
      const moveIntoChild = runWithPrivateContext({ idToken: user.idToken }, async () => {
        return await fileAccessService.moveFile({ descId: parentDir.id, parentDescId: childDir.id })
      })
      await expect(moveIntoChild).rejects.toThrow(BadRequestError)

      // Moving a directory into its grandchild should also fail.
      const moveIntoGrandchild = runWithPrivateContext({ idToken: user.idToken }, async () => {
        return await fileAccessService.moveFile({ descId: parentDir.id, parentDescId: grandChildDir.id })
      })
      await expect(moveIntoGrandchild).rejects.toThrow(BadRequestError)

      // Verify the directory is unchanged.
      const unchangedDir = await runWithPrivateContext({ idToken: user.idToken }, async () => {
        return await fileAccessService.getDescriptor(parentDir.id)
      })
      expect(unchangedDir.parentId).toBe(dirs.sharedRoot.id)
    })
  })

  it("Fail to copy a own directory", async () => {
    const { user, dirs } = await fixtureFactory.createTenantWithOwner()
    testContainer.registerInstance<FileAccessContext>("FileAccessContext", { userId: user.id })
    await runWithDiContainer(testContainer, async () => {
      // Copy directory is prohibited to prevent potential abuse of storage by creating many copies of large directories.
      const fileAccessService = testContainer.resolve<FileAccessService>("FileAccessService")

      const dir = await runWithPrivateContext({ idToken: user.idToken }, async () => {
        return await fileAccessService.makeDirectory({ dirName: "copy-dir-test", parentDescId: dirs.sharedRoot.id })
      })

      const copyResult = runWithPrivateContext({ idToken: user.idToken }, async () => {
        return await fileAccessService.copyFile({ descId: dir.id })
      })
      await expect(copyResult).rejects.toThrow(BadRequestError)
    })
  })

  it("Fail to list files of not permitted directory", async () => {
    const { user, memberUser } = await fixtureFactory.createTenantWithOwnerAndOtherUsers()
    testContainer.registerInstance<FileAccessContext>("FileAccessContext", { userId: user.id })
    await runWithDiContainer(testContainer, async () => {
      const fileAccessProvider = testContainer.resolve<FileAccessService>("FileAccessService")
      const listResult = runWithPrivateContext({ idToken: user.idToken }, async () => {
        return await fileAccessProvider.list({ descId: memberUser.privateDir.id })
      })
      await expect(listResult).rejects.toThrow(PermissionDeniedError)
    })
  })

  it("Can not access other user's private directory even if user has access policy to ancestor folder", async () => {
    const { user, dirs, memberUser } = await fixtureFactory.createTenantWithOwnerAndOtherUsers()
    testContainer.registerInstance<FileAccessContext>("FileAccessContext", { userId: user.id })
    await runWithDiContainer(testContainer, async () => {
      const fileAccessService = testContainer.resolve<FileAccessService>("FileAccessService")
      const dirList = await runWithPrivateContext({ idToken: user.idToken }, async () => {
        return await fileAccessService.list({ descId: dirs.root.id })
      })

      // Check directory list does not contain other user's private directory.
      const ownPrivateDir = dirList.data.find((desc) => desc.id === user.privateDir.id)
      expect(ownPrivateDir).toBeDefined()

      const sharedDir = dirList.data.find((desc) => desc.id === dirs.sharedRoot.id)
      expect(sharedDir).toBeDefined()

      const otherUserPrivateDir = dirList.data.find((desc) => desc.id === memberUser.privateDir.id)
      expect(otherUserPrivateDir).toBeUndefined()
    })
  })

  it("Can not traverse other user's private directory", async () => {
    const { user, memberUser } = await fixtureFactory.createTenantWithOwnerAndOtherUsers()
    testContainer.registerInstance<FileAccessContext>("FileAccessContext", { userId: user.id })
    await runWithDiContainer(testContainer, async () => {
      const fileAccessService = testContainer.resolve<FileAccessService>("FileAccessService")
      const traverseResult = runWithPrivateContext({ idToken: user.idToken }, async () => {
        return await fileAccessService.traverse({ descId: memberUser.privateDir.id, maxDepth: 1 })
      })
      expect(traverseResult).rejects.toThrow(PermissionDeniedError)
    })
  })

  it("Can not see other user's private file when traversing directories", async () => {
    const { user, memberUser, dirs } = await fixtureFactory.createTenantWithOwnerAndOtherUsers()
    testContainer.registerInstance<FileAccessContext>("FileAccessContext", { userId: user.id })
    await runWithDiContainer(testContainer, async () => {
      const fileAccessService = testContainer.resolve<FileAccessService>("FileAccessService")
      const result = await runWithPrivateContext({ idToken: user.idToken }, async () => {
        return await fileAccessService.traverse({ descId: dirs.root.id, maxDepth: 1 })
      })
      expect(result.find((desc) => desc.id === memberUser.privateDir.id)).toBeUndefined()
    })
  })
})
