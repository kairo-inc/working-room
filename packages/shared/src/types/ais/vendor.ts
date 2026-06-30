import {
  AiModelName,
  AiModelTierMappingAnthropic,
  AiModelTierMappingGoogle,
  AiModelTierMapppingOpenAI as AiModelTierMappingOpenAI,
} from "./ai"

export type AiVendorName = "openai" | "anthropic" | "google"

export type AiVendor = {
  name: AiVendorName
  requiredKeys: string[]
}

// OpenAI
export type AiVendorOpenAIConfig = {
  apiKey: string
  // Lower number means higher priority.
  // This is used when the system needs to choose a default vendor for a model that is supported by multiple vendors.
  // null means the vendor is not available and should not be used as default.
  priority: number | null
  tierMapping: AiModelTierMappingOpenAI
}
// Anthropic
export type AiVendorAnthropicConfig = {
  apiKey: string
  priority: number | null
  tierMapping: AiModelTierMappingAnthropic
}
// Google
export type AiVendorGoogleConfig = {
  apiKey: string
  priority: number | null
  tierMapping: AiModelTierMappingGoogle
}

export type AiVendorConfigs = {
  openai?: AiVendorOpenAIConfig
  anthropic?: AiVendorAnthropicConfig
  google?: AiVendorGoogleConfig
}

type Price = {
  outputTokens: number
  inputTokens: number
  cacheInputTokens: number
}

export const aiVendorModelPrice: {
  [key in AiVendorName]?: {
    [model in AiModelName]?: Price
  }
} = {
  openai: {
    "gpt-5.5": {
      outputTokens: 20.0,
      inputTokens: 5.0,
      cacheInputTokens: 0.5,
    },
    "gpt-5.4": {
      outputTokens: 15.0,
      inputTokens: 0.25,
      cacheInputTokens: 0.25,
    },
    "gpt-5.4-mini": {
      outputTokens: 4.5,
      inputTokens: 0.75,
      cacheInputTokens: 0.075,
    },
    "gpt-5.4-nano": {
      outputTokens: 1.25,
      cacheInputTokens: 0.02,
      inputTokens: 0.2,
    },
    "gpt-5.4-pro": {
      outputTokens: 180.0,
      cacheInputTokens: 30.0,
      inputTokens: 30.0,
    },
    "gpt-5.2": {
      outputTokens: 14.0,
      inputTokens: 1.75,
      cacheInputTokens: 0.175,
    },
    "gpt-5.2-pro": {
      outputTokens: 168.0,
      inputTokens: 21.0,
      cacheInputTokens: 21.0,
    },
    "gpt-5.1": {
      outputTokens: 10.0,
      inputTokens: 1.25,
      cacheInputTokens: 0.125,
    },
    "gpt-5": {
      outputTokens: 10.0,
      inputTokens: 1.25,
      cacheInputTokens: 0.125,
    },
    "gpt-5-mini": {
      outputTokens: 2.0,
      inputTokens: 0.25,
      cacheInputTokens: 0.025,
    },
    "gpt-5-nano": {
      outputTokens: 0.4,
      inputTokens: 0.05,
      cacheInputTokens: 0.005,
    },
    "gpt-4.1-mini": {
      outputTokens: 1.6,
      inputTokens: 0.4,
      cacheInputTokens: 0.1,
    },
  },
  google: {
    "gemini-2.5-pro": {
      outputTokens: 10.0,
      inputTokens: 1.25,
      cacheInputTokens: 0.31,
    },
    "gemini-2.5-flash": {
      outputTokens: 3.5,
      inputTokens: 0.3,
      cacheInputTokens: 0.075,
    },
    "gemini-2.5-flash-lite": {
      outputTokens: 0.6,
      inputTokens: 0.1,
      cacheInputTokens: 0.025,
    },
  },
  anthropic: {
    "claude-fable-5": {
      outputTokens: 50.0,
      inputTokens: 10.0,
      cacheInputTokens: 1.0,
    },
    "claude-opus-4-8": {
      outputTokens: 25.0,
      inputTokens: 5.0,
      cacheInputTokens: 0.5,
    },
    "claude-opus-4-7": {
      outputTokens: 25.0,
      inputTokens: 5.0,
      cacheInputTokens: 0.5,
    },
    "claude-opus-4-6": {
      outputTokens: 25.0,
      inputTokens: 5.0,
      cacheInputTokens: 0.5,
    },
    "claude-opus-4-5": {
      outputTokens: 25.0,
      inputTokens: 5.0,
      cacheInputTokens: 0.5,
    },
    "claude-sonnet-4-6": {
      outputTokens: 15.0,
      inputTokens: 3.0,
      cacheInputTokens: 0.3,
    },
    "claude-sonnet-4-5": {
      outputTokens: 15.0,
      inputTokens: 3.0,
      cacheInputTokens: 0.3,
    },
    "claude-haiku-4-5": {
      outputTokens: 5.0,
      inputTokens: 1.0,
      cacheInputTokens: 0.1,
    },
  },
}
