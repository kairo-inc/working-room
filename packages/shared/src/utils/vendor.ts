import { AiModelName } from "../types/ais/ai"
import { AiVendor, AiVendorConfigs, AiVendorName, aiVendorModelPrice } from "../types/ais/vendor"

export const aiVendorOpenAI: AiVendor = { name: "openai", requiredKeys: ["apiKey"] }
export const aiVendorAnthropic: AiVendor = { name: "anthropic", requiredKeys: ["apiKey"] }
export const aiVendorGoogle: AiVendor = { name: "google", requiredKeys: ["apiKey"] }

export const aiVendors: AiVendor[] = [aiVendorOpenAI, aiVendorAnthropic, aiVendorGoogle]
export const aiVendorNames = ["openai", "anthropic", "google"] as const satisfies AiVendorName[]

export const isAiVendorConfigured = (vendor: AiVendor, configs: AiVendorConfigs): boolean => {
  const config = configs[vendor.name]
  return !!config && vendor.requiredKeys.every((k) => !!config[k as keyof typeof config])
}

export const calculateTokenUsageCost = (params: {
  provider: AiVendorName
  model: AiModelName
  cachedInputTokens: number
  noCacheInputTokens: number
  outputTokens: number
}): number => {
  const price = aiVendorModelPrice[params.provider]
  const cachedInputCost = ((price?.[params.model]?.cacheInputTokens ?? 1) * params.cachedInputTokens) / 1_000_000
  const noCachedInputCost = ((price?.[params.model]?.inputTokens ?? 1) * params.noCacheInputTokens) / 1_000_000
  const outputCost = ((price?.[params.model]?.outputTokens ?? 1) * params.outputTokens) / 1_000_000
  return cachedInputCost + noCachedInputCost + outputCost
}
