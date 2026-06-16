import { AiVendor, AiVendorConfigs } from "../types/ais/vendor"

export const aiVendorOpenAI: AiVendor = { name: "openai", requiredKeys: ["apiKey"] }
export const aiVendorAnthropic: AiVendor = { name: "anthropic", requiredKeys: ["apiKey"] }

export const aiVendors: AiVendor[] = [aiVendorOpenAI, aiVendorAnthropic]

export const isAiVendorConfigured = (vendor: AiVendor, configs: AiVendorConfigs): boolean => {
  const config = configs[vendor.name]
  return !!config && vendor.requiredKeys.every((k) => !!config[k as keyof typeof config])
}
