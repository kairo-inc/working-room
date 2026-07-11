export type DomainFileHistory = {
  id: string
  createdAt: Date
  operation: "create" | "edit" | "delete" | "rename" | "move"
  preview: string | null
  blobHash: string | null
  fileDescriptorId: string
  user: {
    email: string
    name: string
  } | null
}
