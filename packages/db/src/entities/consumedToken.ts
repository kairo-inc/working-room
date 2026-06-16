import { ConsumedToken, Prisma } from "@prisma/client"

// EntityConsumedToken.
export class EntityConsumedToken implements Omit<ConsumedToken, "chatId"> {
  id: string
  createdAt: Date
  provider: string
  model: string
  inputTokens: number
  outputTokens: number
  noCacheInputTokens: number
  cachedInputTokens: number
  agentName: string | null
  toolName: string | null

  static select = {
    id: true,
    createdAt: true,
    provider: true,
    model: true,
    inputTokens: true,
    outputTokens: true,
    noCacheInputTokens: true,
    cachedInputTokens: true,
    agentName: true,
    toolName: true,
  } as const satisfies Prisma.ConsumedTokenSelect
}

export const ConsumedTokenSortByList = [
  "createdAt",
  "provider",
  "model",
  "inputTokens",
  "outputTokens",
  "noCacheInputTokens",
  "cachedInputTokens",
] as const

export type ConsumedTokenSortBy = (typeof ConsumedTokenSortByList)[number]
