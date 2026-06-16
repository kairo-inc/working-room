import { AccessGroup, Prisma } from "@prisma/client"

// EntityAccessGroup.
export class EntityAccessGroup implements Omit<AccessGroup, "deletedAt" | "users" | "policies" | "tenantId"> {
  id: string
  createdAt: Date
  updatedAt: Date
  name: string
  description: string | null
  read: boolean
  write: boolean
  isPersonal: boolean
  resources: {
    id: string
    name: string
    pathIds: string
    isDirectory: boolean
    mimeType: string
  }[]

  static select = {
    id: true,
    createdAt: true,
    updatedAt: true,
    name: true,
    description: true,
    read: true,
    write: true,
    isPersonal: true,
    resources: {
      select: {
        id: true,
        name: true,
        pathIds: true,
        isDirectory: true,
        mimeType: true,
      },
      where: {
        deletedAt: null,
      },
    },
  } as const satisfies Prisma.AccessGroupSelect
}

export type AccessGroupSortBy = "id" | "name" | "createdAt" | "updatedAt"
