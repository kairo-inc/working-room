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
  sendMessageOnEnter: boolean

  static select = {
    id: true,
    name: true,
    email: true,
    sub: true,
    createdAt: true,
    updatedAt: true,
    tenantId: true,
    role: true,
    sendMessageOnEnter: true,
  } as const satisfies Prisma.UserSelect
}
export class EntityUserSetting implements Omit<
  User,
  "tenantId" | "sub" | "updatedAt" | "createdAt" | "deletedAt" | "localSecretHash" | "refreshToken"
> {
  email: string
  id: string
  name: string
  role: $Enums.UserRole
  privateDirId: string
  sendMessageOnEnter: boolean

  static select = {
    id: true,
    name: true,
    email: true,
    role: true,
    privateDirId: true,
    sendMessageOnEnter: true,
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
  sendMessageOnEnter: boolean

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
    sendMessageOnEnter: true,
  } as const satisfies Prisma.UserSelect
}

export class EntityUserOauthClient {
  oauthClientsSlack: {
    id: string
    accessToken: string
  }[]

  static select = {
    oauthClientsSlack: {
      select: { id: true, accessToken: true },
    },
  } as const satisfies Prisma.UserSelect
}

export const UserSortByList = ["createdAt", "updatedAt", "email", "name"] as const
export type UserSortBy = (typeof UserSortByList)[number]
