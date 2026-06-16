import { $Enums, FileDescriptor, Prisma } from "@prisma/client"

import { MimeType } from "@wr/shared"

type _EntityFileDescriptor = Omit<FileDescriptor, "updatedAt" | "createdAt" | "deletedAt" | "deletedHash" | "ownerId" | "tenantId">

export class EntityFileDescriptor implements _EntityFileDescriptor {
  id: string
  name: string
  birthtime: Date
  mtime: Date
  size: number
  mimeType: MimeType
  isModifying: boolean
  isDirectory: boolean
  isRoot: boolean
  isSharedRoot: boolean
  parentId: string | null
  pathIds: string
  blobHash: string
  status: $Enums.FileStatus
  isChatDir: boolean
  privateRootOf: { id: string } | null

  static select = {
    id: true,
    name: true,
    size: true,
    mimeType: true,
    birthtime: true,
    mtime: true,
    isModifying: true,
    isDirectory: true,
    isRoot: true,
    isSharedRoot: true,
    parentId: true,
    pathIds: true,
    blobHash: true,
    status: true,
    isChatDir: true,
    privateRootOf: { select: { id: true } },
  } as const satisfies Prisma.FileDescriptorSelect
}

export type FileDescriptorSortBy = "id" | "name" | "birthtime" | "mtime" | "size" | "createdAt" | "updatedAt"
