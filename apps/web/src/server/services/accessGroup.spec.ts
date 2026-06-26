import { PrismaClient } from "@prisma/client"
import { afterEach, beforeEach, describe, expect, it } from "vitest"

import { CoreConfig } from "@wr/core"
import { BadRequestError, InvalidChatDirAccessError, InvalidPrivateDirAccessError, NoContextError, PermissionDeniedError } from "@wr/shared"
import { runWithDiContainer, runWithPrivateContext } from "@wr/shared-node"
import { fixtureFactory } from "@wr/testing"

import { getWebAppDiContainer } from "../container"
import { AccessGroupService } from "./accessGroupType"

describe("[Success] AccessGroupService", () => {
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

  it("Create access group under shared root directory", async () => {
    const { user, dirs } = await fixtureFactory.createTenantWithOwner()
    await runWithDiContainer(testContainer, async () => {
      const accessGroupService = testContainer.resolve<AccessGroupService>("AccessGroupService")
      const result = await runWithPrivateContext({ idToken: user.idToken }, async () => {
        return await accessGroupService.create({
          name: "Marketing Team",
          description: "Marketing team access group",
          resourceId: dirs.sharedRoot.id,
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
      expect(entity?.resources.find((r) => r.id === dirs.sharedRoot.id)).not.toBeUndefined()
      expect(entity?.users.find((u) => u.id === user.id)).not.toBeUndefined()
    })
  })

  it("Delete a non-personal access group", async () => {
    const { user, dirs } = await fixtureFactory.createTenantWithOwner()
    await runWithDiContainer(testContainer, async () => {
      const accessGroupService = testContainer.resolve<AccessGroupService>("AccessGroupService")
      await runWithPrivateContext({ idToken: user.idToken }, async () => {
        const created = await accessGroupService.create({
          name: "Temporary Group",
          resourceId: dirs.sharedRoot.id,
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
    const { user, dirs } = await fixtureFactory.createTenantWithOwner()
    await runWithDiContainer(testContainer, async () => {
      const accessGroupService = testContainer.resolve<AccessGroupService>("AccessGroupService")
      await runWithPrivateContext({ idToken: user.idToken }, async () => {
        const created = await accessGroupService.create({
          name: "Original Name",
          resourceId: dirs.sharedRoot.id,
          read: true,
          write: false,
        })

        await accessGroupService.edit({
          id: created.id,
          name: "Updated Name",
          write: true,
          resourceIdsToAdd: [user.privateDir.id],
        })

        const updated = await accessGroupService.get({ id: created.id })
        expect(updated.name).toBe("Updated Name")
        expect(updated.write).toBe(true)

        const resources = await accessGroupService.getResourceList({ id: created.id })
        expect(resources.map((r) => r.id).sort()).toEqual([user.privateDir.id, dirs.sharedRoot.id].sort())

        await accessGroupService.edit({
          id: created.id,
          resourceIdsToRemove: [user.privateDir.id],
        })
        const resourcesAfterRemove = await accessGroupService.getResourceList({ id: created.id })
        expect(resourcesAfterRemove.map((r) => r.id)).toEqual([dirs.sharedRoot.id])
      })
    })
  })

  it("Get access group, its user list and resource list", async () => {
    const { user, dirs } = await fixtureFactory.createTenantWithOwner()
    await runWithDiContainer(testContainer, async () => {
      const accessGroupService = testContainer.resolve<AccessGroupService>("AccessGroupService")
      await runWithPrivateContext({ idToken: user.idToken }, async () => {
        const created = await accessGroupService.create({
          name: "Lookup Group",
          resourceId: dirs.sharedRoot.id,
          read: true,
          write: true,
        })

        const fetched = await accessGroupService.get({ id: created.id })
        expect(fetched.id).toBe(created.id)

        const list = await accessGroupService.getList({})
        expect(list.data.find((g) => g.id === created.id)).not.toBeUndefined()

        const userList = await accessGroupService.getUserList({ id: created.id })
        expect(userList.data.find((u) => u.id === user.id)).not.toBeUndefined()

        const resourceList = await accessGroupService.getResourceList({ id: created.id })
        expect(resourceList.find((r) => r.id === dirs.sharedRoot.id)).not.toBeUndefined()
      })
    })
  })
})

describe("[Failure] AccessGroupService", () => {
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

  it("Can't create access group for a chat directory", async () => {
    const { user } = await fixtureFactory.createTenantWithOwner()
    await runWithDiContainer(testContainer, async () => {
      const accessGroupService = testContainer.resolve<AccessGroupService>("AccessGroupService")
      const chatDirId = "test-chat-dir-id"
      await prismaClient.fileDescriptor.create({
        data: {
          id: chatDirId,
          name: "chat",
          birthtime: new Date(),
          mtime: new Date(),
          isDirectory: true,
          isChatDir: true,
          parentId: user.privateDir.id,
          pathIds: `${user.privateDir.pathIds}/${chatDirId}`,
          mimeType: "inode/directory",
          size: 0,
          blobHash: "test-chat-dir-blob-hash",
          tenantId: user.tenantId,
        },
      })

      const result = runWithPrivateContext({ idToken: user.idToken }, async () => {
        return await accessGroupService.create({
          name: "Chat Group",
          resourceId: chatDirId,
          read: true,
          write: true,
        })
      })
      await expect(result).rejects.toThrow(InvalidChatDirAccessError)
    })
  })

  it("Can't create access group for a private directory", async () => {
    const { user } = await fixtureFactory.createTenantWithOwner()
    await runWithDiContainer(testContainer, async () => {
      const accessGroupService = testContainer.resolve<AccessGroupService>("AccessGroupService")
      const result = runWithPrivateContext({ idToken: user.idToken }, async () => {
        return await accessGroupService.create({
          name: "Private Group",
          resourceId: user.privateDir.id,
          read: true,
          write: true,
        })
      })
      await expect(result).rejects.toThrow(InvalidPrivateDirAccessError)
    })
  })

  it("Can't delete a personal access group", async () => {
    const { user } = await fixtureFactory.createTenantWithOwner()
    await runWithDiContainer(testContainer, async () => {
      const accessGroupService = testContainer.resolve<AccessGroupService>("AccessGroupService")
      const personalAccessGroup = await prismaClient.accessGroup.findFirstOrThrow({
        where: { users: { some: { id: user.id } }, isPersonal: true },
      })

      const result = runWithPrivateContext({ idToken: user.idToken }, async () => {
        return await accessGroupService.delete({ id: personalAccessGroup.id })
      })
      await expect(result).rejects.toThrow(BadRequestError)
    })
  })

  it("Can't create or delete access group with member role", async () => {
    const { memberUser, dirs } = await fixtureFactory.createTenantWithOwnerAndOtherUsers()
    await runWithDiContainer(testContainer, async () => {
      const accessGroupService = testContainer.resolve<AccessGroupService>("AccessGroupService")
      const createResult = runWithPrivateContext({ idToken: memberUser.idToken }, async () => {
        return await accessGroupService.create({
          name: "Member Group",
          resourceId: dirs.sharedRoot.id,
          read: true,
          write: true,
        })
      })
      await expect(createResult).rejects.toThrow(PermissionDeniedError)

      const deleteResult = runWithPrivateContext({ idToken: memberUser.idToken }, async () => {
        return await accessGroupService.delete({ id: "any-id" })
      })
      await expect(deleteResult).rejects.toThrow(PermissionDeniedError)
    })
  })

  it("Can't create access group without a private context", async () => {
    const { dirs } = await fixtureFactory.createTenantWithOwner()
    await runWithDiContainer(testContainer, async () => {
      const accessGroupService = testContainer.resolve<AccessGroupService>("AccessGroupService")
      const result = accessGroupService.create({
        name: "No Context Group",
        resourceId: dirs.sharedRoot.id,
        read: true,
        write: true,
      })
      await expect(result).rejects.toThrow(NoContextError)
    })
  })

  it("Can't edit a personal access group to add/remove users or resources", async () => {
    const { user } = await fixtureFactory.createTenantWithOwner()
    await runWithDiContainer(testContainer, async () => {
      const accessGroupService = testContainer.resolve<AccessGroupService>("AccessGroupService")
      const personalAccessGroup = await prismaClient.accessGroup.findFirstOrThrow({
        where: { users: { some: { id: user.id } }, isPersonal: true },
      })

      const resultAddUser = runWithPrivateContext({ idToken: user.idToken }, async () => {
        return await accessGroupService.edit({
          id: personalAccessGroup.id,
          userIdsToAdd: ["any-user-id"],
        })
      })
      await expect(resultAddUser).rejects.toThrow(InvalidPrivateDirAccessError)

      const resultRemoveUser = runWithPrivateContext({ idToken: user.idToken }, async () => {
        return await accessGroupService.edit({
          id: personalAccessGroup.id,
          userIdsToRemove: ["any-user-id"],
        })
      })
      await expect(resultRemoveUser).rejects.toThrow(InvalidPrivateDirAccessError)

      const resultAddResource = runWithPrivateContext({ idToken: user.idToken }, async () => {
        return await accessGroupService.edit({
          id: personalAccessGroup.id,
          resourceIdsToAdd: ["any-resource-id"],
        })
      })
      await expect(resultAddResource).rejects.toThrow(InvalidPrivateDirAccessError)

      const resultRemoveResource = runWithPrivateContext({ idToken: user.idToken }, async () => {
        return await accessGroupService.edit({
          id: personalAccessGroup.id,
          resourceIdsToRemove: ["any-resource-id"],
        })
      })
      await expect(resultRemoveResource).rejects.toThrow(InvalidPrivateDirAccessError)
    })
  })

  it("Can't delete personal access group even with owner role", async () => {
    const { user } = await fixtureFactory.createTenantWithOwner()
    await runWithDiContainer(testContainer, async () => {
      const accessGroupService = testContainer.resolve<AccessGroupService>("AccessGroupService")
      const personalAccessGroup = await prismaClient.accessGroup.findFirstOrThrow({
        where: { users: { some: { id: user.id } }, isPersonal: true },
      })

      const resultDelete = runWithPrivateContext({ idToken: user.idToken }, async () => {
        return await accessGroupService.delete({ id: personalAccessGroup.id })
      })
      await expect(resultDelete).rejects.toThrow(BadRequestError)
    })
  })

  it("Can't delete owner access group even with owner role", async () => {
    const { user } = await fixtureFactory.createTenantWithOwner()
    await runWithDiContainer(testContainer, async () => {
      const accessGroupService = testContainer.resolve<AccessGroupService>("AccessGroupService")
      const ownerAccessGroup = await prismaClient.accessGroup.findFirstOrThrow({
        where: { users: { some: { id: user.id } }, isOwner: true },
      })

      const resultDelete = runWithPrivateContext({ idToken: user.idToken }, async () => {
        return await accessGroupService.delete({ id: ownerAccessGroup.id })
      })
      await expect(resultDelete).rejects.toThrow(BadRequestError)
    })
  })
})
