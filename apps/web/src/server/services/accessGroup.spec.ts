import { PrismaClient } from "@prisma/client"
import { beforeEach, describe, expect, it } from "vitest"

import { CoreConfig } from "@wr/core"
import { BadRequestError, InvalidChatDirAccessError, InvalidPrivateDirAccessError, NoContextError, PermissionDeniedError } from "@wr/shared"
import { encodeJwt, runWithDiContainer, runWithPrivateContext } from "@wr/shared-node"
import {
  createTestConfigWithTmpFolder,
  createTestPrismaClient,
  testPrivateUserRootDirId,
  testSharedRootDirId,
  testTenantId,
  testUserEmail,
  testUserId,
  testUserIdTokenAdmin,
} from "@wr/testing"

import { getWebAppDiContainer } from "../container"
import { AccessGroupService } from "./accessGroupType"

describe("[Success] AccessGroupService", () => {
  let testContainer: ReturnType<typeof getWebAppDiContainer>
  let prismaClient: PrismaClient

  beforeEach(async () => {
    testContainer = getWebAppDiContainer().createChildContainer()
    const config: CoreConfig = createTestConfigWithTmpFolder()
    prismaClient = await createTestPrismaClient()
    testContainer.registerInstance<CoreConfig>("CoreConfig", config)
    testContainer.registerInstance<PrismaClient>("PrismaClient", prismaClient)
  })

  it("Create access group under shared root directory", async () => {
    await runWithDiContainer(testContainer, async () => {
      const accessGroupService = testContainer.resolve<AccessGroupService>("AccessGroupService")
      const result = await runWithPrivateContext({ idToken: testUserIdTokenAdmin }, async () => {
        return await accessGroupService.create({
          name: "Marketing Team",
          description: "Marketing team access group",
          resourceId: testSharedRootDirId,
          read: true,
          write: true,
        })
      })

      expect(result.name).toBe("Marketing Team")
      expect(result.description).toBe("Marketing team access group")
      expect(result.isPersonal).toBe(false)
      expect(result.read).toBe(true)
      expect(result.write).toBe(true)

      const entity = await prismaClient.accessGroup.findUnique({
        where: { id: result.id },
        include: { resources: true, users: true },
      })
      expect(entity).not.toBeNull()
      expect(entity?.resources.find((r) => r.id === testSharedRootDirId)).not.toBeUndefined()
      expect(entity?.users.find((u) => u.id === testUserId)).not.toBeUndefined()
    })
  })

  it("Delete a non-personal access group", async () => {
    await runWithDiContainer(testContainer, async () => {
      const accessGroupService = testContainer.resolve<AccessGroupService>("AccessGroupService")
      await runWithPrivateContext({ idToken: testUserIdTokenAdmin }, async () => {
        const created = await accessGroupService.create({
          name: "Temporary Group",
          resourceId: testSharedRootDirId,
          read: true,
          write: false,
        })
        await accessGroupService.delete({ id: created.id })

        const entity = await prismaClient.accessGroup.findUnique({ where: { id: created.id } })
        expect(entity?.deletedAt).not.toBeNull()
      })
    })
  })

  it("Edit access group name, permission, users and resources", async () => {
    await runWithDiContainer(testContainer, async () => {
      const accessGroupService = testContainer.resolve<AccessGroupService>("AccessGroupService")
      await runWithPrivateContext({ idToken: testUserIdTokenAdmin }, async () => {
        const created = await accessGroupService.create({
          name: "Original Name",
          resourceId: testSharedRootDirId,
          read: true,
          write: false,
        })

        await accessGroupService.edit({
          id: created.id,
          name: "Updated Name",
          write: true,
          resourceIdsToAdd: [testPrivateUserRootDirId],
        })

        const updated = await accessGroupService.get({ id: created.id })
        expect(updated.name).toBe("Updated Name")
        expect(updated.write).toBe(true)

        const resources = await accessGroupService.getResourceList({ id: created.id })
        expect(resources.map((r) => r.id).sort()).toEqual([testPrivateUserRootDirId, testSharedRootDirId].sort())

        await accessGroupService.edit({
          id: created.id,
          resourceIdsToRemove: [testPrivateUserRootDirId],
        })
        const resourcesAfterRemove = await accessGroupService.getResourceList({ id: created.id })
        expect(resourcesAfterRemove.map((r) => r.id)).toEqual([testSharedRootDirId])
      })
    })
  })

  it("Get access group, its user list and resource list", async () => {
    await runWithDiContainer(testContainer, async () => {
      const accessGroupService = testContainer.resolve<AccessGroupService>("AccessGroupService")
      await runWithPrivateContext({ idToken: testUserIdTokenAdmin }, async () => {
        const created = await accessGroupService.create({
          name: "Lookup Group",
          resourceId: testSharedRootDirId,
          read: true,
          write: true,
        })

        const fetched = await accessGroupService.get({ id: created.id })
        expect(fetched.id).toBe(created.id)

        const list = await accessGroupService.getList({})
        expect(list.data.find((g) => g.id === created.id)).not.toBeUndefined()

        const userList = await accessGroupService.getUserList({ id: created.id })
        expect(userList.data.find((u) => u.id === testUserId)).not.toBeUndefined()

        const resourceList = await accessGroupService.getResourceList({ id: created.id })
        expect(resourceList.find((r) => r.id === testSharedRootDirId)).not.toBeUndefined()
      })
    })
  })
})

describe("[Failure] AccessGroupService", () => {
  let testContainer: ReturnType<typeof getWebAppDiContainer>
  let prismaClient: PrismaClient

  beforeEach(async () => {
    testContainer = getWebAppDiContainer().createChildContainer()
    const config: CoreConfig = createTestConfigWithTmpFolder()
    prismaClient = await createTestPrismaClient()
    testContainer.registerInstance<CoreConfig>("CoreConfig", config)
    testContainer.registerInstance<PrismaClient>("PrismaClient", prismaClient)
  })

  it("Can't create access group for a chat directory", async () => {
    await runWithDiContainer(testContainer, async () => {
      const accessGroupService = testContainer.resolve<AccessGroupService>("AccessGroupService")
      const sharedRootDir = await prismaClient.fileDescriptor.findUniqueOrThrow({ where: { id: testSharedRootDirId } })
      const chatDir = await prismaClient.fileDescriptor.create({
        data: {
          id: "test-chat-dir-id",
          name: "chat",
          birthtime: new Date(),
          mtime: new Date(),
          isDirectory: true,
          isChatDir: true,
          parentId: sharedRootDir.id,
          pathIds: `${sharedRootDir.pathIds}/test-chat-dir-id`,
          mimeType: "inode/directory",
          size: 0,
          blobHash: "test-chat-dir-blob-hash",
          tenantId: testTenantId,
        },
      })

      const result = runWithPrivateContext({ idToken: testUserIdTokenAdmin }, async () => {
        return await accessGroupService.create({
          name: "Chat Group",
          resourceId: chatDir.id,
          read: true,
          write: true,
        })
      })
      await expect(result).rejects.toThrow(InvalidChatDirAccessError)
    })
  })

  it("Can't create access group for a private directory", async () => {
    await runWithDiContainer(testContainer, async () => {
      const accessGroupService = testContainer.resolve<AccessGroupService>("AccessGroupService")
      const result = runWithPrivateContext({ idToken: testUserIdTokenAdmin }, async () => {
        return await accessGroupService.create({
          name: "Private Group",
          resourceId: testPrivateUserRootDirId,
          read: true,
          write: true,
        })
      })
      await expect(result).rejects.toThrow(InvalidPrivateDirAccessError)
    })
  })

  it("Can't delete a personal access group", async () => {
    await runWithDiContainer(testContainer, async () => {
      const accessGroupService = testContainer.resolve<AccessGroupService>("AccessGroupService")
      const personalAccessGroup = await prismaClient.accessGroup.findFirstOrThrow({
        where: { users: { some: { id: testUserId } }, isPersonal: true },
      })

      const result = runWithPrivateContext({ idToken: testUserIdTokenAdmin }, async () => {
        return await accessGroupService.delete({ id: personalAccessGroup.id })
      })
      await expect(result).rejects.toThrow(BadRequestError)
    })
  })

  it("Can't create or delete access group with member role", async () => {
    await runWithDiContainer(testContainer, async () => {
      const accessGroupService = testContainer.resolve<AccessGroupService>("AccessGroupService")
      const memberIdToken = encodeJwt(
        {
          email: testUserEmail,
          role: "member",
          userId: testUserId,
          tenantId: testTenantId,
        },
        "test-secret"
      )

      const createResult = runWithPrivateContext({ idToken: memberIdToken }, async () => {
        return await accessGroupService.create({
          name: "Member Group",
          resourceId: testSharedRootDirId,
          read: true,
          write: true,
        })
      })
      await expect(createResult).rejects.toThrow(PermissionDeniedError)

      const deleteResult = runWithPrivateContext({ idToken: memberIdToken }, async () => {
        return await accessGroupService.delete({ id: "any-id" })
      })
      await expect(deleteResult).rejects.toThrow(PermissionDeniedError)
    })
  })

  it("Can't create access group without a private context", async () => {
    await runWithDiContainer(testContainer, async () => {
      const accessGroupService = testContainer.resolve<AccessGroupService>("AccessGroupService")
      const result = accessGroupService.create({
        name: "No Context Group",
        resourceId: testSharedRootDirId,
        read: true,
        write: true,
      })
      await expect(result).rejects.toThrow(NoContextError)
    })
  })
})
