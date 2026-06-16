import { $Enums, Prisma, User } from "@prisma/client"

export { UserRole } from "@prisma/client"

// EntityUser.
export class EntityUser implements Omit<User, "deletedAt" | "localSecretHash" | "refreshToken" | "privateDirId"> {
  createdAt: Date
  updatedAt: Date
  email: string
  sub: string
  id: string
  name: string
  tenantId: string
  role: $Enums.UserRole

  static select = {
    id: true,
    name: true,
    email: true,
    sub: true,
    createdAt: true,
    updatedAt: true,
    tenantId: true,
    role: true,
  } as const satisfies Prisma.UserSelect
}
export class EntityUserSetting implements Omit<
  User,
  "tenantId" | "sub" | "updatedAt" | "createdAt" | "deletedAt" | "localSecretHash" | "refreshToken" | "privateDirId"
> {
  email: string
  id: string
  name: string
  role: $Enums.UserRole

  static select = {
    id: true,
    name: true,
    email: true,
    role: true,
  } as const satisfies Prisma.UserSelect
}

export class EntityUserSecret implements Omit<User, "deletedAt" | "privateDirId"> {
  createdAt: Date
  updatedAt: Date
  email: string
  sub: string
  id: string
  name: string
  localSecretHash: string | null
  tenantId: string
  role: $Enums.UserRole
  refreshToken: string | null

  static select = {
    id: true,
    name: true,
    email: true,
    sub: true,
    createdAt: true,
    updatedAt: true,
    tenantId: true,
    localSecretHash: true,
    role: true,
    refreshToken: true,
  } as const satisfies Prisma.UserSelect
}

export type UserSortBy = "createdAt" | "updatedAt" | "email" | "name"
