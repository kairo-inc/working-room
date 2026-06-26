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

const createUserWithRole = async (tenantId: string, role: UserRole, rootDirId: string) => {
  const client = new PrismaClient()
  const userId = `user-${tenantId}-${role}-${randomId()}`
  const userEmail = `user-${tenantId}-${role}-${randomId()}@workingroom.io`
  const userSub = `user-sub-${tenantId}-${role}-${randomId()}`
  const privateUserRootDirId = `private-user-private-${role}-${randomId()}`

  await client.fileDescriptor.create({
    data: {
      id: privateUserRootDirId,
      name: "private",
      birthtime: new Date(),
      mtime: new Date(),
      isRoot: false,
      isDirectory: true,
      parentId: rootDirId,
      pathIds: `/${rootDirId}/${privateUserRootDirId}`,
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
              connect: { id: privateUserRootDirId },
            },
          },
        ],
      },
      privateDir: {
        connect: { id: privateUserRootDirId },
      },
      fileDescriptors: {
        connect: { id: privateUserRootDirId },
      },
    },
  })

  const user: TestUser = {
    id: userId,
    email: userEmail,
    sub: userSub,
    role,
    tenantId,
    privateDir: { id: privateUserRootDirId, pathIds: `/${rootDirId}/${privateUserRootDirId}` },
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

  const rootDirId = `root-${tenantId}`
  const rootDir = await client.fileDescriptor.create({
    data: {
      id: rootDirId,
      name: "root",
      birthtime: new Date(),
      mtime: new Date(),
      isRoot: true,
      isDirectory: true,
      pathIds: `/${rootDirId}`,
      mimeType: "inode/directory",
      size: 0,
      blobHash: "test-root-blob-hash",
      tenantId: tenant.id,
    },
  })

  const sharedRootDirId = `shared-root-${tenantId}`
  const sharedRootDir = await client.fileDescriptor.create({
    data: {
      id: sharedRootDirId,
      name: "shared",
      birthtime: new Date(),
      mtime: new Date(),
      isRoot: false,
      isDirectory: true,
      parentId: rootDir.id,
      pathIds: `${rootDir.pathIds}/${sharedRootDirId}`,
      mimeType: "inode/directory",
      size: 0,
      blobHash: "test-shared-root-blob-hash",
      tenantId: tenant.id,
    },
  })

  // Private user root dir
  const privateUserRootDirId = `private-user-root-${tenantId}`
  await client.fileDescriptor.create({
    data: {
      id: privateUserRootDirId,
      name: "private",
      birthtime: new Date(),
      mtime: new Date(),
      isRoot: false,
      isDirectory: true,
      parentId: rootDir.id,
      pathIds: `${rootDir.pathIds}/${privateUserRootDirId}`,
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
              connect: { id: privateUserRootDirId },
            },
          },
          {
            name: `Owner access group`,
            read: true,
            write: true,
            isOwner: true,
            tenant: { connect: { id: tenant.id } },
            resources: {
              connect: { id: rootDir.id },
            },
          },
        ],
      },
      privateDir: {
        connect: { id: privateUserRootDirId },
      },
      fileDescriptors: {
        connect: { id: privateUserRootDirId },
      },
    },
  })

  const user: TestUser = {
    id: testUserId,
    email: testUserEmail,
    sub: testUserSub,
    role: "owner" as UserRole,
    tenantId: tenant.id,
    privateDir: { id: privateUserRootDirId, pathIds: `${rootDir.pathIds}/${privateUserRootDirId}` },
  }

  return {
    tenant: { id: tenant.id },
    user: {
      ...user,
      idToken: createIdToken(user),
    } satisfies TestUserWithToken,
    dirs: {
      root: { id: rootDir.id, pathIds: rootDir.pathIds },
      sharedRoot: { id: sharedRootDir.id, pathIds: sharedRootDir.pathIds },
    },
  }
}

const createTenantWithOwnerAndOtherUsers = async () => {
  const fixtures = await createTenantWithOwner()
  const { tenant, dirs } = fixtures
  return {
    ...fixtures,
    adminUser: await createUserWithRole(tenant.id, "admin", dirs.root.id),
    memberUser: await createUserWithRole(tenant.id, "member", dirs.root.id),
  }
}

const createTestConfigWithTmpFolder = (options?: Partial<CoreConfig>): CoreConfig => {
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

const removeTestFolder = async (config: CoreConfig) => {
  try {
    rmSync(config.root, { recursive: true, force: true })
    rmSync(config.blobDir, { recursive: true, force: true })
  } catch (e) {
    console.error(`Failed to clean up temporary directory: ${e.message}`)
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
