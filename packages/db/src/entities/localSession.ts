import { LocalSession, Prisma } from "@prisma/client"

// EntitySession.
export class EntityLocalSession implements Omit<LocalSession, "deletedAt"> {
  createdAt: Date
  updatedAt: Date
  id: string
  jwt: string
  userId: string
  expiresAt: Date
  needsPasswordInitialization: boolean
  sessionCode: string | null

  static select = {
    id: true,
    createdAt: true,
    updatedAt: true,
    jwt: true,
    userId: true,
    expiresAt: true,
    needsPasswordInitialization: true,
    sessionCode: true,
  } as const satisfies Prisma.LocalSessionSelect
}

export type LocalSessionSortBy = "createdAt" | "updatedAt" | "expiresAt" | "userId"
