import { AnthropicMessagesModelId } from "@ai-sdk/anthropic/internal"
import { GoogleLanguageModel } from "@ai-sdk/google/internal"
import { OpenAIChatModelId } from "@ai-sdk/openai/internal"

import { MimeType } from "../common"

export const AiModelTierList = ["light", "medium", "heavy"] as const
export type AiModelTier = (typeof AiModelTierList)[number]

// Ref: https://developers.openai.com/api/docs/pricing
export type AiModelOpenAI = Extract<
  OpenAIChatModelId,
  | "o4-mini"
  | "gpt-4.1"
  | "gpt-4.1-mini"
  | "gpt-4.1-nano"
  | "gpt-4o"
  | "gpt-4o-mini"
  | "gpt-3.5-turbo"
  | "gpt-5"
  | "gpt-5-mini"
  | "gpt-5-nano"
  | "gpt-5.1"
  | "gpt-5.2"
  | "gpt-5.2-pro"
  | "gpt-5.4"
  | "gpt-5.4-mini"
  | "gpt-5.4-nano"
  | "gpt-5.4-pro"
  | "gpt-5.5"
>

export const openAiDefaultTierMapping: Record<AiModelTier, AiModelOpenAI> = {
  heavy: "gpt-5.5",
  medium: "gpt-5.4-mini",
  light: "gpt-5.4-nano",
}

export type AiModelTierMapppingOpenAI = typeof openAiDefaultTierMapping

// Ref: https://platform.claude.com/docs/en/about-claude/pricing
export type AiModelAnthropic = Extract<
  AnthropicMessagesModelId,
  | "claude-haiku-4-5-20251001"
  | "claude-haiku-4-5"
  | "claude-sonnet-4-20250514"
  | "claude-sonnet-4-5-20250929"
  | "claude-sonnet-4-5"
  | "claude-sonnet-4-6"
  | "claude-opus-4-5"
  | "claude-opus-4-5-20251101"
  | "claude-opus-4-6"
  | "claude-opus-4-7"
  | "claude-opus-4-8"
  | "claude-fable-5"
>

export const anthropicDefaultTierMapping: Record<AiModelTier, AiModelAnthropic> = {
  heavy: "claude-opus-4-8",
  medium: "claude-sonnet-4-6",
  light: "claude-haiku-4-5",
}
export type AiModelTierMappingAnthropic = typeof anthropicDefaultTierMapping

// Ref: https://ai.google.dev/gemini-api/docs/models
export type AiModelGoogle = Extract<
  GoogleLanguageModel["modelId"],
  | "gemini-2.5-pro"
  | "gemini-2.5-flash"
  | "gemini-2.5-flash-lite"
  | "gemini-2.5-mini"
  | "gemini-3.5-flash"
  | "gemini-pro-latest"
  | "gemini-flash-latest"
  | "gemini-flash-lite-latest"
  | "gemini-robotics-er-1.5-preview"
  | "gemma-3-1b-it"
  | "gemma-3-4b-it"
  | "gemma-3n-e4b-it"
  | "gemma-3n-e2b-it"
  | "gemma-3-12b-it"
  | "gemma-3-27b-it"
>

export const googleDefaultTierMapping: Record<AiModelTier, AiModelGoogle> = {
  heavy: "gemini-2.5-pro",
  medium: "gemini-2.5-flash",
  light: "gemini-2.5-flash-lite",
}
export type AiModelTierMappingGoogle = typeof googleDefaultTierMapping

// Self-hosting AI models
export type AiModelSelfHosted =
  | `Qwen/Qwen2.5-3B-Instruct`
  | `Qwen/Qwen2.5-7B-Instruct`
  | `Qwen/Qwen2.5-14B-Instruct`
  | `Qwen/Qwen2.5-Chat-3B`
  | `Qwen/Qwen2.5-Chat-7B`
  | `Qwen/Qwen2.5-Chat-14B`

export const selfHostedDefaultTierMapping: Record<AiModelTier, AiModelSelfHosted> = {
  // The same model is used for all tiers in this example, but you can customize it based on your self-hosted model availability and performance.
  heavy: "Qwen/Qwen2.5-3B-Instruct",
  medium: "Qwen/Qwen2.5-3B-Instruct",
  light: "Qwen/Qwen2.5-3B-Instruct",
}
export type AiModelTierMappingSelfHosted = typeof selfHostedDefaultTierMapping

export type AiModelTierMapping =
  AiModelTierMapppingOpenAI | AiModelTierMappingAnthropic | AiModelTierMappingGoogle | AiModelTierMappingSelfHosted

export type AiModel =
  `openai:${AiModelOpenAI}` | `anthropic:${AiModelAnthropic}` | `google:${AiModelGoogle}` | `self-hosted:${AiModelSelfHosted}`

export type AiModelName = AiModelOpenAI | AiModelAnthropic | AiModelGoogle | AiModelSelfHosted

export type AiWorkingFolder = {
  id: string
  name: string
  items: {
    id: string
    name: string
    mimeType: MimeType
  }[]
  parent?: {
    id: string
    name: string
  }
}
