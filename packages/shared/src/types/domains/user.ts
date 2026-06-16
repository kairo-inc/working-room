import { TokenData } from "../common"

export const userRoles = ["owner", "admin", "member", "guest"] as const

export type DomainUser = {
  id: string
  createdAt: Date
  updatedAt: Date
  email: string
  sub: string
  name: string
  tenantId: string
  role: TokenData["role"]
}
