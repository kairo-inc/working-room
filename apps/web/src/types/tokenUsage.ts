import { AiModelName, AiVendorName } from "@wr/shared"

export type AppTokenUsageOnTenant = {
  createdAt: Date
  provider: AiVendorName
  model: AiModelName
  cachedInputTokens: number
  noCacheInputTokens: number
  inputTokens: number
  outputTokens: number
}
