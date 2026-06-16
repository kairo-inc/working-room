export type AppTokenUsageOnTenant = {
  createdAt: Date
  provider: string
  model: string
  cachedInputTokens: number
  noCacheInputTokens: number
  inputTokens: number
  outputTokens: number
}
