import z from "zod"

import {
  DomainAssistantMessage,
  DomainMessage,
  DomainSystemMessage,
  DomainToolMessage,
  DomainUserMessage,
  ImplementationError,
  supportedImageMimeTypes,
  supportedMimeTypes,
} from "@wr/shared"

import { EntityMessage } from "../entities/message"

export const userContentSchema = z.array(
  z.union([
    z.object({
      type: z.literal("text"),
      text: z.string(),
    }),
    z.object({
      type: z.literal("meta"),
      text: z.string(),
    }),
    z.object({
      type: z.literal("image"),
      descId: z.string(),
      mediaType: z.enum(supportedImageMimeTypes),
      image: z.string(),
    }),
    z.object({
      type: z.literal("file"),
      descId: z.string(),
      mediaType: z.enum(supportedMimeTypes),
      data: z.string(),
    }),
    z.object({
      type: z.literal("file-ref"),
      descId: z.string(),
      blobHash: z.string(),
      mimeType: z.enum(supportedMimeTypes),
    }),
  ])
)

export const assistantContentSchema = z.array(
  z.union([
    z.object({
      type: z.literal("text"),
      text: z.string(),
    }),
    z.object({
      type: z.literal("tool-call"),
      toolCallId: z.string(),
      toolName: z.string(),
      input: z.unknown(),
    }),
    z.object({
      type: z.literal("proceeded-file"),
      descId: z.string(),
      blobHash: z.string(),
      mimeType: z.enum(supportedMimeTypes),
    }),
  ])
)

export const toolResultOutputSchema = z.union([
  z.object({
    type: z.literal("text"),
    value: z.string(),
  }),
  z.object({
    type: z.literal("json"),
    value: z.string(),
  }),
  z.object({
    type: z.literal("execution-denied"),
    reason: z.string().optional(),
  }),
  z.object({
    type: z.literal("error-text"),
    value: z.string(),
  }),
  z.object({
    type: z.literal("error-json"),
    value: z.string(),
  }),
  z.object({
    type: z.literal("image"),
    image: z.string(),
    mediaType: z.enum(supportedImageMimeTypes),
    descId: z.string(),
  }),
  z.object({
    type: z.literal("file-ref"),
    descId: z.string(),
    blobHash: z.string(),
    mimeType: z.enum(supportedMimeTypes),
  }),
])

export const toolResultContentSchema = z.array(
  z.union([
    z.object({
      type: z.literal("tool-result"),
      toolCallId: z.string(),
      toolName: z.string(),
      output: toolResultOutputSchema,
      isError: z.boolean().optional(),
    }),
    z.object({
      type: z.literal("proceeded-file"),
      descId: z.string(),
      blobHash: z.string(),
      mimeType: z.enum(supportedMimeTypes),
    }),
  ])
)

export const mapUserMessageEntityToDomain = (entity: EntityMessage): DomainUserMessage => {
  if (entity.role !== "user") {
    throw new ImplementationError(`EntityMessage role is not "user": ${entity.role}`)
  }
  const content = userContentSchema.parse(JSON.parse(entity.content ?? "[]"))
  return {
    id: entity.id,
    role: "user",
    content: content,
    isUserFacing: entity.isUserFacing,
  } satisfies DomainUserMessage
}

export const mapAssistantMessageEntityToDomain = (entity: EntityMessage): DomainAssistantMessage => {
  if (entity.role !== "assistant") {
    throw new ImplementationError(`EntityMessage role is not "assistant": ${entity.role}`)
  }
  const content = assistantContentSchema.parse(JSON.parse(entity.content ?? "[]"))
  return {
    id: entity.id,
    role: "assistant",
    content,
    isUserFacing: entity.isUserFacing,
  } satisfies DomainAssistantMessage
}

export const mapSystemMessageEntityToDomain = (entity: EntityMessage): DomainSystemMessage => {
  if (entity.role !== "system") {
    throw new ImplementationError(`EntityMessage role is not "system": ${entity.role}`)
  }
  return {
    id: entity.id,
    role: "system",
    content: entity.content,
    isUserFacing: entity.isUserFacing,
  } satisfies DomainSystemMessage
}

export const mapToolMessageEntityToDomain = (entity: EntityMessage): DomainToolMessage => {
  if (entity.role !== "tool") {
    throw new ImplementationError(`EntityMessage role is not "tool": ${entity.role}`)
  }
  const content = toolResultContentSchema.parse(JSON.parse(entity.content ?? "[]"))
  return {
    id: entity.id,
    role: "tool",
    content,
    isUserFacing: entity.isUserFacing,
  } satisfies DomainToolMessage
}

export const mapMessageEntityToDomain = (entity: EntityMessage): DomainMessage => {
  switch (entity.role) {
    case "user":
      return mapUserMessageEntityToDomain(entity)
    case "assistant":
      return mapAssistantMessageEntityToDomain(entity)
    case "system":
      return mapSystemMessageEntityToDomain(entity)
    case "tool":
      return mapToolMessageEntityToDomain(entity)
    default:
      throw new ImplementationError(`Unsupported message role: ${entity.role}`)
  }
}

type PartialEntityMessage = Omit<EntityMessage, "createdAt" | "updatedAt" | "chatId" | "sequence">
export const mapMessageDomainToEntity = (message: DomainMessage): PartialEntityMessage => {
  const { content } = message
  return {
    id: message.id,
    role: message.role,
    content: JSON.stringify(content),
    isUserFacing: message.isUserFacing ?? false,
  }
}
