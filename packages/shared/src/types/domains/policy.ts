export type DomainAccessPolicy = {
  id: string
  name: string
  description?: string
  write: boolean
  read: boolean
  resources: {
    id: string
    pathIds?: string
    isDirectory: boolean
    mimeType: string
  }[]
}
