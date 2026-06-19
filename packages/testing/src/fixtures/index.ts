import { PrismaClient } from "@prisma/client"
import { mkdirSync, rmSync } from "node:fs"
import { tmpdir } from "node:os"
import path from "node:path"

import type { CoreConfig } from "@wr/core"
import { encodeJwt, randomId } from "@wr/shared-node"

export const testTenantId = "test-tenant-id"
export const testRootDirId = "test-root-dir-id"
export const testSharedRootDirId = "test-shared-root-dir-id"
// User
export const testUserSub = "test-sub"
export const testUserId = "test-user-id"
export const testUserEmail = "test@workingroom.io"
export const testPrivateUserRootDirId = "test-private-user-root-dir-id"
// Other user.
export const testOtherUserSub = "test-other-sub"
export const testOtherUserId = "test-other-user-id"
export const testOtherUserEmail = "other@workingroom.io"
export const testPrivateOtherUserRootDirId = "test-private-other-user-root-dir-id"
// Not exist user.
export const testNotExistUserSub = "test-not-exist-sub"
export const testNotExistUserId = "test-not-exist-user-id"
export const testNotExistUserEmail = "test-no-exist@workingroom.io"

// Role
export const testUserPrivateRoleId = "test-user-private-role-id"

// For testing.
export const testCoreConfig: CoreConfig = {
  root: "./test-root",
  blobDir: "./test-root/blobs",
}

export const testUserIdTokenAdmin = encodeJwt(
  {
    email: testUserEmail,
    role: "admin",
    userId: testUserId,
    tenantId: testTenantId,
  },
  "test-secret"
)

export const testOtherUserIdTokenAdmin = encodeJwt(
  {
    email: testOtherUserEmail,
    role: "admin",
    userId: testOtherUserId,
    tenantId: testTenantId,
  },
  "test-secret"
)

export const createTestPrismaClient = async (options?: { withoutFixtures?: boolean }): Promise<PrismaClient> => {
  const client = new PrismaClient()

  // Clear existing data.
  await client.fileDescriptor.deleteMany().catch(() => {})
  await client.accessGroup.deleteMany().catch(() => {})
  await client.user.deleteMany().catch(() => {})
  await client.tenant.deleteMany().catch(() => {})

  if (options?.withoutFixtures) {
    return client
  }

  // Add common fixtures.
  const tenant = await client.tenant.create({
    data: {
      id: testTenantId,
      name: "Test Tenant",
    },
  })
  const rootDir = await client.fileDescriptor.create({
    data: {
      id: testRootDirId,
      name: "root",
      birthtime: new Date(),
      mtime: new Date(),
      isRoot: true,
      isDirectory: true,
      pathIds: `/${testRootDirId}`,
      mimeType: "inode/directory",
      size: 0,
      blobHash: "test-root-blob-hash",
      tenantId: tenant.id,
    },
  })

  const sharedRootDir = await client.fileDescriptor.create({
    data: {
      id: testSharedRootDirId,
      name: "shared",
      birthtime: new Date(),
      mtime: new Date(),
      isRoot: false,
      isDirectory: true,
      isSharedRoot: true,
      parentId: rootDir.id,
      pathIds: `${rootDir.pathIds}/${testSharedRootDirId}`,
      mimeType: "inode/directory",
      size: 0,
      blobHash: "test-shared-root-blob-hash",
      tenantId: tenant.id,
    },
  })

  const privateUserRootDir = await client.fileDescriptor.create({
    data: {
      id: testPrivateUserRootDirId,
      name: "private",
      birthtime: new Date(),
      mtime: new Date(),
      isRoot: false,
      isDirectory: true,
      parentId: rootDir.id,
      pathIds: `${rootDir.pathIds}/${testPrivateUserRootDirId}`,
      mimeType: "inode/directory",
      size: 0,
      blobHash: "test-private-user-root-blob-hash",
      tenantId: tenant.id,
    },
  })

  const privateOtherUserRootDir = await client.fileDescriptor.create({
    data: {
      id: testPrivateOtherUserRootDirId,
      name: "private",
      birthtime: new Date(),
      mtime: new Date(),
      isRoot: false,
      isDirectory: true,
      parentId: rootDir.id,
      pathIds: `${rootDir.pathIds}/${testPrivateOtherUserRootDirId}`,
      mimeType: "inode/directory",
      size: 0,
      blobHash: "test-private-other-user-root-blob-hash",
      tenantId: tenant.id,
    },
  })

  // User.
  await client.user.create({
    data: {
      id: testUserId,
      email: testUserEmail,
      role: "owner",
      sub: testUserSub,
      name: "Test User",
      tenant: { connect: { id: tenant.id } },
      accessGroups: {
        create: [
          {
            name: `${testUserEmail.split("@")[0]}'s personal access group`,
            read: true,
            write: true,
            isPersonal: true,
            tenant: { connect: { id: tenant.id } },
            resources: {
              connect: { id: privateUserRootDir.id },
            },
          },
          {
            name: `Owner access group`,
            read: true,
            write: true,
            isPersonal: false,
            tenant: { connect: { id: tenant.id } },
            resources: {
              connect: { id: rootDir.id },
            },
          },
        ],
      },
      privateDir: {
        connect: { id: testPrivateUserRootDirId },
      },
      fileDescriptors: {
        connect: { id: testPrivateUserRootDirId },
      },
    },
  })

  // Other user.
  await client.user.create({
    data: {
      id: testOtherUserId,
      email: testOtherUserEmail,
      role: "admin",
      sub: testOtherUserSub,
      name: "Other Test User",
      tenant: { connect: { id: tenant.id } },
      privateDir: {
        connect: { id: testPrivateOtherUserRootDirId },
      },
      fileDescriptors: {
        connect: { id: testPrivateOtherUserRootDirId },
      },
      accessGroups: {
        create: {
          name: `${testOtherUserEmail.split("@")[0]}'s personal access group`,
          read: true,
          write: true,
          isPersonal: true,
          tenant: { connect: { id: tenant.id } },
          resources: {
            connect: { id: privateOtherUserRootDir.id },
          },
        },
      },
    },
  })

  return client
}

// Files.
export const createTestConfigWithTmpFolder = (options?: Partial<CoreConfig>): CoreConfig => {
  const tmpDir = `${tmpdir()}/test-root-${randomId()}`
  // Create files.
  const rootDir = options?.root ? path.join(tmpDir, options.root) : `${tmpDir}`
  const blobDir = options?.blobDir ? path.join(tmpDir, options.blobDir) : `${tmpDir}/blob`
  mkdirSync(rootDir, { recursive: true })
  mkdirSync(blobDir, { recursive: true })
  return {
    root: rootDir,
    blobDir: blobDir,
  }
}

export const removeTestFolder = async (config: CoreConfig) => {
  try {
    rmSync(config.root, { recursive: true, force: true })
    rmSync(config.blobDir, { recursive: true, force: true })
  } catch (e) {
    console.error(`Failed to clean up temporary directory: ${e.message}`)
  }
}
