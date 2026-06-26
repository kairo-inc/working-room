import { MimeType } from "@wr/shared"

export type AppFileDescriptor = {
  id: string
  birthtime: Date
  mtime: Date
  name: string
  blobHash: string
  mimeType: MimeType
  isDirectory: boolean
  isPrivateRoot: boolean
  isChatDir: boolean
  parentId?: string
  isRoot: boolean
  pathIds: string
}

export type AppFileDescriptorEssential = {
  id: string
  name: string
  pathIds?: string
  isDirectory: boolean
  mimeType: string
}
