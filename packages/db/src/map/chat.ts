import z from "zod"

import { DomainChat, DomainChatStatus, DomainToolTypeEnum } from "@wr/shared"

import { EntityChat, EntityChatStatus } from "../entities"
import { mapUserMessageEntityToDomain } from "./message"

const toolCallSchema = z.object({
  type: z.literal("tool-call"),
  toolCallId: z.string(),
  toolName: z.string(),
  input: z.unknown(),
  baseState: z.unknown().optional(),
})
const pendingApprovalSchema = z.object({
  agentName: z.string(),
  needApprovals: z.array(
    z.object({
      approvalId: z.string(),
      toolCall: toolCallSchema,
      toolType: z.enum(DomainToolTypeEnum),
      change: z
        .object({
          files: z
            .array(
              z.object({
                descId: z.string(),
                mimeType: z.string(),
                path: z.string(),
              })
            )
            .optional(),
          change: z.string().optional(),
        })
        .optional(),
    })
  ),
  otherToolCalls: z.array(toolCallSchema),
})
const interactionsSchema = z.array(
  z.object({
    interactionId: z.string(),
    agentId: z.string(),
    parentInteractionId: z.string().optional(),
    agentName: z.string(),
    depth: z.number(),
    summary: z.string().optional(),
    startedAt: z.number(),
    completedAt: z.number().optional(),
  })
)

export const mapChatEntityToDomain = (entity: EntityChat): DomainChat => {
  const lastMessage = entity.messages[0]
  return {
    id: entity.id,
    updatedAt: entity.updatedAt,
    requireApproval: entity.requireApproval,
    lastUserMessage: lastMessage ? mapUserMessageEntityToDomain(lastMessage) : undefined,
  }
}

export const mapChatStatusEntityToDomain = (entity: EntityChatStatus): DomainChatStatus => {
  let interactions: DomainChatStatus["interactions"] = []
  let pendingApproval: DomainChatStatus["pendingApproval"]
  if (entity.pendingApproval) {
    const parsed = pendingApprovalSchema.safeParse(JSON.parse(entity.pendingApproval))
    if (parsed.success) {
      pendingApproval = parsed.data
    }
  }

  if (entity.interactions) {
    const parsed = interactionsSchema.safeParse(JSON.parse(entity.interactions))
    if (parsed.success) {
      interactions = parsed.data
    }
  }

  return {
    id: entity.id,
    requireApproval: entity.requireApproval,
    pendingApproval: pendingApproval ?? undefined,
    interactions,
    workingFolder: entity.workingFolder ?? undefined,
  }
}

type PartialEntityChatStatus = Omit<EntityChatStatus, "createdAt" | "updatedAt" | "messages" | "userId" | "resources">

export const mapChatStatusDomainToEntity = (domain: DomainChatStatus): PartialEntityChatStatus => {
  return {
    id: domain.id,
    requireApproval: domain.requireApproval,
    pendingApproval: domain.pendingApproval ? JSON.stringify(domain.pendingApproval) : null,
    interactions: domain.interactions ? JSON.stringify(domain.interactions) : null,
    workingFolder: domain.workingFolder ?? null,
  }
}
