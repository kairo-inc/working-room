import { MimeType } from "../common"

export type DomainFilePathDescriptor = {
  id: string
}

export type DomainFileDescriptor = {
  id: string
  birthtime: number
  mtime: number
  isDirectory: boolean
  isRoot: boolean
  name: string
  size: number
  mimeType: MimeType
  blobHash: string
  pathIds: string
  parentId: string | null
  isPrivateRoot: boolean
  isChatDir: boolean
  status: "exist" | "missing" | "deleted"
}

export type DomainFileStat = {
  id: string
  birthtime: number
  mtime: number
  isDirectory: boolean
  name: string
  size: number
  mimeType: MimeType
}
