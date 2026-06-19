/**
 * A seed file to populate the database with initial data for documentation screenshot generation.
 * Do not expose this seed file outside of the package, as it is intended for internal use only.
 *
 * Screen shot must be:
 * - size: 1280x720
 * - theme: both light and dark
 */
import { fileURLToPath } from "node:url"

import { makePasswordHash } from "@wr/shared-node"

import { createPrismaClient } from "../db"

const isMain = process.argv[1] === fileURLToPath(import.meta.url)

const generateData = async () => {
  const password = "docs"
  const hashedPassword = await makePasswordHash(password)

  const client = createPrismaClient()
  await client.tenant.deleteMany()
  await client.user.deleteMany()
  await client.fileDescriptor.deleteMany()

  const rootDirId = "docs-root-dir-id"
  const userPrivateDirId = "docs-user-private-dir-id"
  const tenantId = "docs-tenant"
  const userId = "docs-user"
  await client.tenant.create({
    data: {
      id: tenantId,
      name: "Docs Tenant",
    },
  })

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
      tenant: { connect: { id: tenantId } },
    },
  })

  await client.user.create({
    data: {
      id: userId,
      email: "docs@workingroom.io",
      sub: "docs-sub",
      name: "Docs User",
      role: "owner",
      localSecretHash: hashedPassword,
      tenant: { connect: { id: tenantId } },
      privateDir: {
        create: {
          id: userPrivateDirId,
          parent: { connect: { id: rootDir.id } },
          name: "private",
          birthtime: new Date(),
          mtime: new Date(),
          isDirectory: true,
          pathIds: rootDir.pathIds + `/${userPrivateDirId}`,
          mimeType: "inode/directory",
          size: 0,
          // Same as root dir since it's empty at the moment. It will be updated when files are added.
          blobHash: rootDir.blobHash,
          tenant: { connect: { id: tenantId } },
        },
      },
    },
  })
}

// Run when and only when this file is explicitly executed, not when imported as a module.
if (isMain) {
  generateData().catch((error) => {
    console.error("Error generating data:", error)
  })
}
