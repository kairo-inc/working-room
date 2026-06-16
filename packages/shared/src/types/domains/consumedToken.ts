export type DomainConsumedToken = {
  inputTokens: number
  outputTokens: number
  noCacheInputTokens: number
  cachedInputTokens: number

  inputTokenPrice: number
  outputTokenPrice: number
  noCacheInputTokenPrice: number
  cachedInputTokenPrice: number

  provider: string
  model: string
}
