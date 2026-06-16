import { FileOperation } from "@wr/db"

export type AppFileHistory = {
  id: string
  createdAt: Date
  blobHash: string | null
  operation: FileOperation
  userEmail?: string
  userName?: string
}
