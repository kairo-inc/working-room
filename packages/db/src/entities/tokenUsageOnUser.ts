import { Prisma, TokenUsageOnUser } from "@prisma/client"

export class EntityTokenUsageOnUser implements TokenUsageOnUser {
  createdAt: Date
  userId: string
  provider: string
  model: string
  inputTokens: number
  outputTokens: number
  noCacheInputTokens: number
  cachedInputTokens: number

  static select = {
    createdAt: true,
    userId: true,
    provider: true,
    model: true,
    inputTokens: true,
    outputTokens: true,
    noCacheInputTokens: true,
    cachedInputTokens: true,
  } as const satisfies Prisma.TokenUsageOnUserSelect
}

export const TokenUsageOnUserSortByList = [
  "createdAt",
  "userId",
  "provider",
  "model",
  "inputTokens",
  "outputTokens",
  "noCacheInputTokens",
  "cachedInputTokens",
] as const

export type TokenUsageOnUserSortBy = (typeof TokenUsageOnUserSortByList)[number]
