export type ENV = "local" | "dev" | "stg" | "prod"
export const DB_PROVIDER_VALUES = ["sqlite", "postgresql"] as const
export type DB_PROVIDER = (typeof DB_PROVIDER_VALUES)[number]

export type IdToken = { idToken: string }

export type TokenData = {
  email: string
  tenantId: string
  userId: string
  // This must match the enum values defined in the database.
  role: "owner" | "admin" | "member" | "guest"
  exp: number
  iat: number
}

export const SortDirectionList = ["asc", "desc"] as const
export type SortDirection = (typeof SortDirectionList)[number]

export type SortArg<T> = {
  sortBy?: T
  sortDirection?: SortDirection
}

export type PageArg<T> = {
  page?: number
  take?: number
} & SortArg<T>

export type PageResult<T> = {
  data: T[]
  nextPage: number | null
  maxPage: number
  count: number
}

export const supportedTextMimeTypes = ["text/markdown", "text/plain", "text/csv"] as const
export const supportedImageMimeTypes = ["image/jpeg", "image/png", "image/gif", "image/webp"] as const
export const supportedBinaryMimeTypes = ["application/pdf", "application/octet-stream", ...supportedImageMimeTypes] as const
export const supportedMimeTypes = [
  "inode/directory",
  "text/markdown",
  "text/plain",
  "text/csv",
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "application/pdf",
  "application/octet-stream",
] as const

export type FolderMimeType = "inode/directory"
export type ImageMimeType = (typeof supportedImageMimeTypes)[number] | string
export type MimeType = (typeof supportedMimeTypes)[number] | string
