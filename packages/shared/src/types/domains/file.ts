import { MimeType } from "../common"

export type DomainFilePathDescriptor = {
  id: string
}

export type DomainFileDescriptor = {
  id: string
  birthtime: number
  mtime: number
  isFolder: boolean
  isRoot: boolean
  name: string
  size: number
  mimeType: MimeType
  blobHash: string
  pathIds: string
  parentId: string | null
  isPrivateRoot: boolean
  isChatFolder: boolean
  status: "exist" | "missing" | "deleted"
}

export type DomainFileStat = {
  id: string
  birthtime: number
  mtime: number
  isFolder: boolean
  name: string
  size: number
  mimeType: MimeType
}
