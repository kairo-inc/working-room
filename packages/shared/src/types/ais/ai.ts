import { AnthropicMessagesModelId } from "@ai-sdk/anthropic/internal"
import { GoogleGenerativeAIModelId } from "@ai-sdk/google/internal"
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
export type AiModelGoogle = Extract<GoogleGenerativeAIModelId, "gemini-2.5-pro" | "gemini-2.5-flash" | "gemini-2.5-flash-lite">

export const googleDefaultTierMapping: Record<AiModelTier, AiModelGoogle> = {
  heavy: "gemini-2.5-pro",
  medium: "gemini-2.5-flash",
  light: "gemini-2.5-flash-lite",
}
export type AiModelTierMappingGoogle = typeof googleDefaultTierMapping

export type AiModelTierMapping = AiModelTierMapppingOpenAI | AiModelTierMappingAnthropic | AiModelTierMappingGoogle

export type AiModel = `openai:${AiModelOpenAI}` | `anthropic:${AiModelAnthropic}` | `google:${AiModelGoogle}`

export type AiModelName = AiModelOpenAI | AiModelAnthropic | AiModelGoogle

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
