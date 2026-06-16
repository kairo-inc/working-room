import { Prisma, TokenUsageOnTenant } from "@prisma/client"

export class EntityTokenUsageOnTenant implements TokenUsageOnTenant {
  createdAt: Date
  tenantId: string
  provider: string
  model: string
  inputTokens: number
  outputTokens: number
  noCacheInputTokens: number
  cachedInputTokens: number

  static select = {
    createdAt: true,
    tenantId: true,
    provider: true,
    model: true,
    inputTokens: true,
    outputTokens: true,
    noCacheInputTokens: true,
    cachedInputTokens: true,
  } as const satisfies Prisma.TokenUsageOnTenantSelect
}

export const TokenUsageOnTenantSortByList = [
  "createdAt",
  "tenantId",
  "provider",
  "model",
  "inputTokens",
  "outputTokens",
  "noCacheInputTokens",
  "cachedInputTokens",
] as const

export type TokenUsageOnTenantSortBy = (typeof TokenUsageOnTenantSortByList)[number]
