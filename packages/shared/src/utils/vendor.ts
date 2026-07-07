import { AiModelName } from "../types/ais/ai"
import { AiVendor, AiVendorConfigs, AiVendorName, aiVendorModelPrice } from "../types/ais/vendor"

export const aiVendorOpenAI: AiVendor = { name: "openai", requiredKeys: ["apiKey"] }
export const aiVendorAnthropic: AiVendor = { name: "anthropic", requiredKeys: ["apiKey"] }
export const aiVendorGoogle: AiVendor = { name: "google", requiredKeys: ["apiKey"] }
export const aiVendorSelfHosted: AiVendor = { name: "selfHosted", requiredKeys: ["apiKey", "baseUrl"] }

export const aiVendors: AiVendor[] = [aiVendorOpenAI, aiVendorAnthropic, aiVendorGoogle, aiVendorSelfHosted]
export const aiVendorNames = ["openai", "anthropic", "google", "selfHosted"] as const satisfies AiVendorName[]

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
  const modelName = params.model?.split(":")[1] as AiModelName
  const cachedInputCost = ((price?.[modelName]?.cacheInputTokens ?? 0) * params.cachedInputTokens) / 1_000_000
  const noCachedInputCost = ((price?.[modelName]?.inputTokens ?? 0) * params.noCacheInputTokens) / 1_000_000
  const outputCost = ((price?.[modelName]?.outputTokens ?? 0) * params.outputTokens) / 1_000_000
  return cachedInputCost + noCachedInputCost + outputCost
}
