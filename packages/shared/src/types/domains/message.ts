import { Tool } from "ai"

import { ImageMimeType, MimeType } from "../common"

export type DomainToolDef = Tool

export type DomainToolResultOutputText = { type: "text"; value: string }
export type DomainToolResultOutputJson = { type: "json"; value: string }
export type DomainToolResultOutputExecutionDenied = { type: "execution-denied"; reason?: string }
export type DomainToolResultOutputErrorText = { type: "error-text"; value: string }
export type DomainToolResultOutputErrorJson = { type: "error-json"; value: string }
export type DomainToolResultOutputImage = {
  type: "image"
  descId: string
  mediaType: ImageMimeType
  // This is base64 encoded image "without" data URL prefix, for example: "iVBORw0KGgoAAAANSUhEUgAA...".
  image: string
}
export type DomainToolResultOutputFile = {
  type: "file"
  descId: string
  mediaType: MimeType
  // This is base64 encoded data "without" data URL prefix, for example: "iVBORw0KGgoAAAANSUhEUgAA...".
  data: string
}
export type DomainToolResultOutputFileRef = { type: "file-ref"; descId: string; blobHash: string; mimeType: string }

export type DomainToolResultOutput =
  | DomainToolResultOutputText
  | DomainToolResultOutputJson
  | DomainToolResultOutputExecutionDenied
  | DomainToolResultOutputErrorText
  | DomainToolResultOutputErrorJson
  | DomainToolResultOutputImage
  | DomainToolResultOutputFileRef
  | DomainToolResultOutputFile

/**
 * DomainAiMetaContent is used to store any user meta information such as current time, user preferences, or any other contextual information
 * that can be useful for the assistant to generate better responses.
 * It is not meant to be displayed to the user directly, but can be used by the assistant to understand the context better.
 *
 * The text content will be fed as a text input to the LLM like:
 * <meta>Current time: 2024-01-01T00:00:00Z; User preferences: prefers concise answers</meta>
 */
export type DomainMessageContentMeta = { type: "meta"; text: string }

/**
 * DomainMessageContentFileRef is a reference to a file that can be used in messages,
 * which can be resolved to the actual file content by the receiver using the descId and blobHash.
 * This allows for efficient file handling without embedding large file content directly in messages.
 */
export type DomainMessageContentFileRef = { type: "file-ref"; descId: string; blobHash: string; mimeType: MimeType }

/**
 * DomainMessageContentProceededFile will be inserted into the assistant message when the assistant calls a tool to process a file.
 * This content is just a reference to the processed file, which can be displayed to the user, but it will not be fed into the LLMs.
 */
export type DomainMessageContentProceededFile = { type: "proceeded-file"; descId: string; blobHash: string; mimeType: MimeType }

export type DomainMessageContentText = { type: "text"; text: string }
export type DomainMessageContentImage = {
  type: "image"
  descId: string
  mediaType: ImageMimeType
  image: string
}
export type DomainMessageContentFile = {
  type: "file"
  descId: string
  mediaType: MimeType
  // This is base64 encoded data "without" data URL prefix, for example: "iVBORw0KGgoAAAANSUhEUgAA...".
  data: string
}
export type DomainMessageContentTextFile = {
  type: "text-file"
  descId: string
  mediaType: MimeType
  // Text data.
  data: string
}

export type DomainMessageContentToolCall = {
  type: "tool-call"
  toolCallId: string
  toolName: string
  input: unknown
  // Store any state of the target resource at just before the tool execution, to be used for approval decision or tool execution on resume.
  // The content depends on the tool type, for example, it can be the blob hash for a file writing tool, or the target URL and DOM snapshot for a web interaction tool.
  baseState?: unknown
}
export type DomainMessageContentToolResult = {
  type: "tool-result"
  toolCallId: string
  toolName: string
  output: DomainToolResultOutput
  isError?: boolean
}

export type DomainUserMessage = {
  id: string
  isUserFacing?: boolean
  role: "user"
  content: Array<
    | DomainMessageContentText
    | DomainMessageContentImage
    | DomainMessageContentFile
    | DomainMessageContentTextFile
    | DomainMessageContentMeta
    | DomainMessageContentFileRef
  >
}

export type DomainAssistantMessage = {
  id: string
  isUserFacing?: boolean
  role: "assistant"
  content: Array<DomainMessageContentText | DomainMessageContentToolCall | DomainMessageContentProceededFile>
}

export type DomainSystemMessage = {
  id: string
  isUserFacing?: boolean
  role: "system"
  content: string
}

export type DomainToolMessage = {
  id: string
  isUserFacing?: boolean
  role: "tool"
  content: Array<DomainMessageContentToolResult | DomainMessageContentProceededFile>
}

export type DomainMessageContent =
  | DomainMessageContentText
  | DomainMessageContentImage
  | DomainMessageContentFile
  | DomainMessageContentTextFile
  | DomainMessageContentToolCall
  | DomainMessageContentToolResult
  | DomainMessageContentMeta
  | DomainMessageContentFileRef
  | DomainMessageContentProceededFile

export type DomainMessage = DomainUserMessage | DomainAssistantMessage | DomainSystemMessage | DomainToolMessage

export type DomainMessageWithoutId = Omit<DomainMessage, "id">

export const isDomainUserMessage = (message: DomainMessageWithoutId): message is DomainUserMessage => {
  return message.role === "user"
}
export const isDomainAssistantMessage = (message: DomainMessageWithoutId): message is DomainAssistantMessage => {
  return message.role === "assistant"
}
export const isDomainSystemMessage = (message: DomainMessageWithoutId): message is DomainSystemMessage => {
  return message.role === "system"
}
export const isDomainToolMessage = (message: DomainMessageWithoutId): message is DomainToolMessage => {
  return message.role === "tool"
}
