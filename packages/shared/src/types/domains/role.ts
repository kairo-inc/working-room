import { DomainAccessPolicy } from "./policy"

export type DomainRole = {
  id: string
  name: string
  description?: string
  policies: DomainAccessPolicy[]
}
