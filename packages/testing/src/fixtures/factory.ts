import { PrismaClient, UserRole } from "@prisma/client"
import { mkdirSync, rmSync } from "node:fs"
import { tmpdir } from "node:os"
import path from "node:path"

import { CoreConfig } from "@wr/core"
import { encodeJwt, randomId } from "@wr/shared-node"

type TestUser = {
  id: string
  email: string
  sub: string
  role: UserRole
  tenantId: string
  privateDir: { id: string; pathIds: string }
}
type TestUserWithToken = TestUser & {
  idToken: string
}

const resetDatabase = async () => {
  const client = new PrismaClient()
  // Clear existing data.
  await client.fileDescriptor.deleteMany().catch(() => {})
  await client.accessGroup.deleteMany().catch(() => {})
  await client.user.deleteMany().catch(() => {})
  await client.tenant.deleteMany().catch(() => {})
}

const createUserWithRole = async (tenantId: string, role: UserRole, rootFolderId: string) => {
  const client = new PrismaClient()
  const userId = `user-${tenantId}-${role}-${randomId()}`
  const userEmail = `user-${tenantId}-${role}-${randomId()}@workingroom.io`
  const userSub = `user-sub-${tenantId}-${role}-${randomId()}`
  const privateUserRootFolderId = `private-user-private-${role}-${randomId()}`

  await client.fileDescriptor.create({
    data: {
      id: privateUserRootFolderId,
      name: "private",
      birthtime: new Date(),
      mtime: new Date(),
      isRoot: false,
      isDirectory: true,
      parentId: rootFolderId,
      pathIds: `/${rootFolderId}/${privateUserRootFolderId}`,
      mimeType: "inode/directory",
      size: 0,
      blobHash: `test-private-user-root-blob-hash-${role}`,
      tenantId,
    },
  })

  await client.user.create({
    data: {
      id: userId,
      email: userEmail,
      role,
      sub: userSub,
      name: `Test User ${role}`,
      tenant: { connect: { id: tenantId } },
      accessGroups: {
        create: [
          {
            name: `${userEmail.split("@")[0]}'s personal access group`,
            read: true,
            write: true,
            isPersonal: true,
            tenant: { connect: { id: tenantId } },
            resources: {
              connect: { id: privateUserRootFolderId },
            },
          },
        ],
      },
      privateDir: {
        connect: { id: privateUserRootFolderId },
      },
      fileDescriptors: {
        connect: { id: privateUserRootFolderId },
      },
    },
  })

  const user: TestUser = {
    id: userId,
    email: userEmail,
    sub: userSub,
    role,
    tenantId,
    privateDir: { id: privateUserRootFolderId, pathIds: `/${rootFolderId}/${privateUserRootFolderId}` },
  }
  return {
    ...user,
    idToken: createIdToken(user),
  } satisfies TestUserWithToken
}

const createTenantWithOwner = async () => {
  const client = new PrismaClient()

  // Tenant
  const tenant = await client.tenant.create({
    data: {
      name: "Test Tenant",
    },
  })
  const tenantId = tenant.id

  const rootFolderId = `root-${tenantId}`
  const rootFolder = await client.fileDescriptor.create({
    data: {
      id: rootFolderId,
      name: "root",
      birthtime: new Date(),
      mtime: new Date(),
      isRoot: true,
      isDirectory: true,
      pathIds: `/${rootFolderId}`,
      mimeType: "inode/directory",
      size: 0,
      blobHash: "test-root-blob-hash",
      tenantId: tenant.id,
    },
  })

  const sharedRootFolderId = `shared-root-${tenantId}`
  const sharedRootFolder = await client.fileDescriptor.create({
    data: {
      id: sharedRootFolderId,
      name: "shared",
      birthtime: new Date(),
      mtime: new Date(),
      isRoot: false,
      isDirectory: true,
      parentId: rootFolder.id,
      pathIds: `${rootFolder.pathIds}/${sharedRootFolderId}`,
      mimeType: "inode/directory",
      size: 0,
      blobHash: "test-shared-root-blob-hash",
      tenantId: tenant.id,
    },
  })

  // Private user root folder
  const privateUserRootFolderId = `private-user-root-${tenantId}`
  await client.fileDescriptor.create({
    data: {
      id: privateUserRootFolderId,
      name: "private",
      birthtime: new Date(),
      mtime: new Date(),
      isRoot: false,
      isDirectory: true,
      parentId: rootFolder.id,
      pathIds: `${rootFolder.pathIds}/${privateUserRootFolderId}`,
      mimeType: "inode/directory",
      size: 0,
      blobHash: "test-private-user-root-blob-hash",
      tenantId: tenant.id,
    },
  })

  // User.
  const testUserSub = `user-sub-${tenantId}`
  const testUserId = `user-${tenantId}`
  const testUserEmail = `user-${tenantId}@workingroom.io`
  await client.user.create({
    data: {
      id: testUserId,
      email: testUserEmail,
      role: "owner" as UserRole,
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
              connect: { id: privateUserRootFolderId },
            },
          },
          {
            name: `Owner access group`,
            read: true,
            write: true,
            isOwner: true,
            tenant: { connect: { id: tenant.id } },
            resources: {
              connect: { id: rootFolder.id },
            },
          },
        ],
      },
      privateDir: {
        connect: { id: privateUserRootFolderId },
      },
      fileDescriptors: {
        connect: { id: privateUserRootFolderId },
      },
    },
  })

  const user: TestUser = {
    id: testUserId,
    email: testUserEmail,
    sub: testUserSub,
    role: "owner" as UserRole,
    tenantId: tenant.id,
    privateDir: { id: privateUserRootFolderId, pathIds: `${rootFolder.pathIds}/${privateUserRootFolderId}` },
  }

  return {
    tenant: { id: tenant.id },
    user: {
      ...user,
      idToken: createIdToken(user),
    } satisfies TestUserWithToken,
    folders: {
      root: { id: rootFolder.id, pathIds: rootFolder.pathIds },
      sharedRoot: { id: sharedRootFolder.id, pathIds: sharedRootFolder.pathIds },
    },
  }
}

const createTenantWithOwnerAndOtherUsers = async () => {
  const fixtures = await createTenantWithOwner()
  const { tenant, folders } = fixtures
  return {
    ...fixtures,
    adminUser: await createUserWithRole(tenant.id, "admin", folders.root.id),
    memberUser: await createUserWithRole(tenant.id, "member", folders.root.id),
  }
}

const createTestConfigWithTmpFolder = (options?: Partial<CoreConfig>): CoreConfig => {
  const tmpFolder = `${tmpdir()}/test-root-${randomId()}`
  // Create files.
  const rootDir = options?.root ? path.join(tmpFolder, options.root) : `${tmpFolder}`
  const blobDir = options?.blobDir ? path.join(tmpFolder, options.blobDir) : `${tmpFolder}/blob`
  mkdirSync(rootDir, { recursive: true })
  mkdirSync(blobDir, { recursive: true })
  return {
    root: rootDir,
    blobDir: blobDir,
  }
}

const removeTestFolder = async (config: CoreConfig) => {
  try {
    rmSync(config.root, { recursive: true, force: true })
    rmSync(config.blobDir, { recursive: true, force: true })
  } catch (e) {
    console.error(`Failed to clean up temporary folder: ${e.message}`)
  }
}

const createIdToken = (user: TestUser) => {
  return encodeJwt(
    {
      email: user.email,
      role: user.role,
      userId: user.id,
      tenantId: user.tenantId,
    },
    "test-secret"
  )
}

const createDbClient = async () => {
  const client = new PrismaClient()
  await resetDatabase()
  return client
}

export const fixtureFactory = {
  resetDatabase,
  createTenantWithOwner,
  createTenantWithOwnerAndOtherUsers,
  createTestConfigWithTmpFolder,
  removeTestFolder,
  createIdToken,
  createDbClient,
}
