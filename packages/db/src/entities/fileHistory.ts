import { FileHistory, Prisma } from "@prisma/client"

// EntityFileHistory.
export class EntityFileHistory implements Omit<FileHistory, "fileDescriptor" | "userId"> {
  id: string
  createdAt: Date
  fileDescriptorId: string
  operation: FileHistory["operation"]
  preview: string | null
  blobHash: string | null
  user: {
    email: string
    name: string
  } | null

  static select = {
    id: true,
    createdAt: true,
    fileDescriptorId: true,
    operation: true,
    preview: true,
    blobHash: true,
    user: {
      select: { email: true, name: true },
    },
  } as const satisfies Prisma.FileHistorySelect
}

export const FileHistorySortByList = ["createdAt", "fileDescriptorId", "operation"] as const

export type FileHistorySortBy = (typeof FileHistorySortByList)[number]
