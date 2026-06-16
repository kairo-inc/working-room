import { inject, injectable } from "tsyringe"

import {
  AgentProps,
  ChatEngineOnChunkCallback,
  ChatEngineRunResult,
  ChatEvent,
  EventBus,
  buildChatStateFromDomain,
  buildChatStateToDomain,
} from "@wr/core"
import {
  ChatSource,
  ConsumedTokenSource,
  EntityFileDescriptor,
  FileDescriptorSource,
  MessageSource,
  mapChatEntityToDomain,
  mapChatStatusDomainToEntity,
  mapChatStatusEntityToDomain,
  mapMessageDomainToEntity,
  mapMessageEntityToDomain,
} from "@wr/db"
import {
  AiWorkingFolder,
  BadRequestError,
  BaseError,
  DomainMessage,
  DomainMessageContentFileRef,
  DomainUserMessage,
  MimeType,
  PageResult,
  isDomainSystemMessage,
} from "@wr/shared"
import { createAsyncQueue, getPrivateContext } from "@wr/shared-node"

import { mapChatDomainToApp, mapChatNeedApprovalDomainToApp, mapChatStatusDomainToApp } from "../../map/chat"
import { mapMessageDomainToApp } from "../../map/message"
import { AppChat, AppChatStatus } from "../../types/chat"
import { AppMessage } from "../../types/message"
import { AppStreamEvent } from "../../types/stream"
import { Resolver } from "../resolver"
import {
  ChatService,
  ChatServiceCreateArg,
  ChatServiceDeleteArg,
  ChatServiceGetListArg,
  ChatServiceGetMessagesArg,
  ChatServiceGetStatusArg,
  ChatServiceRunSingleLoopArg,
} from "./chatType"

// NOTE: Additional agents can be registered by providing them in the AdditionalAgents injection token.
// This allows for dynamic extension of the agent catalog without modifying the core codebase.
const exampleAdditionalAgent: AgentProps = {
  name: "company-rule-agent",
  defaultTier: "medium",
  description:
    "An agent that provides information about company rules and policies. It takes user questions about company rules and provides answers based on the company's policy documents. It can call tools to retrieve specific policy documents if needed, but its main focus is to provide accurate and helpful information about company rules.",
  prompt: `You are a company rule agent. Your task is to provide information about company rules and policies based on user questions.
You can call tools to retrieve specific policy documents if needed, but your main focus is to provide accurate and helpful information about company rules.
Always try to understand the user's question clearly and provide relevant information that helps them understand the company's policies.
`,
}

@injectable()
export class ChatServiceImpl extends ChatService {
  constructor(
    @inject("Resolver") private resolver: Resolver,
    @inject("FileDescriptorSource") private fileDescriptorSource: FileDescriptorSource,
    @inject("MessageSource") private messageSource: MessageSource,
    @inject("ConsumedTokenSource") private consumedTokenSource: ConsumedTokenSource,
    @inject("ChatSource") private chatSource: ChatSource
  ) {
    super()
  }

  async create(args: ChatServiceCreateArg): Promise<AppChat> {
    const {} = args
    const { userId } = getPrivateContext()
    const chat = await this.chatSource.create({
      data: {
        user: { connect: { id: userId } },
      },
    })
    const domainChat = mapChatEntityToDomain(chat)
    const appChat = mapChatDomainToApp(domainChat)
    return appChat
  }

  async getStatus(args: ChatServiceGetStatusArg): Promise<AppChatStatus> {
    const { id } = args
    const { userId } = getPrivateContext()
    const chat = await this.chatSource.find("EntityChatStatus", { where: { id, userId } })
    const domainChat = mapChatStatusEntityToDomain(chat)
    const appChat = mapChatStatusDomainToApp(domainChat)
    return appChat
  }

  async getList(args: ChatServiceGetListArg): Promise<PageResult<AppChat>> {
    const pages = args
    const { userId } = getPrivateContext()

    // NOTE: Remove empty chats here.
    const thresholdDate = new Date(Date.now() - 10 * 60 * 1000) // 10 min threshold

    await this.chatSource
      .deleteMany({ where: { userId, messages: { none: {} }, createdAt: { lt: thresholdDate } }, physically: true })
      .catch((e) => console.error("Error deleting empty chats:", e))

    // Only shows chats with messages to simplify the UI, as empty chats are usually created by accident and not useful.
    const { data, ...rest } = await this.chatSource.findMany("EntityChat", { where: { userId, messages: { some: {} } }, ...pages })
    const appData = data.map(mapChatEntityToDomain).map(mapChatDomainToApp)
    return { data: appData, ...rest }
  }

  async delete(args: ChatServiceDeleteArg): Promise<void> {
    const { id } = args
    const { userId } = getPrivateContext()
    await this.chatSource.delete({ where: { id, userId } })
  }

  async getMessages(args: ChatServiceGetMessagesArg): Promise<PageResult<AppMessage>> {
    const { id, ...pages } = args
    const { userId } = getPrivateContext()
    const { data, ...rest } = await this.messageSource.findMany("EntityMessage", {
      where: { chatId: id, isUserFacing: true, chat: { userId } },
      ...pages,
    })
    const appData = data.map(mapMessageEntityToDomain).map(mapMessageDomainToApp)
    return { data: appData, ...rest }
  }

  private async messageContextToFile(messages: DomainMessage[]): Promise<DomainMessage[]> {
    const fileService = await this.resolver.resolveFileService()
    const domainMessages: DomainMessage[] = []
    for (const domainMsg of messages) {
      if (isDomainSystemMessage(domainMsg)) {
        // The content is type of string. It won't have file reference, so we can directly push it to the result array.
        domainMessages.push(domainMsg)
      } else {
        const updatedContent = []
        const { content: originalContent, ...rest } = domainMsg
        for (const content of originalContent) {
          const updated = fileService.referenceToDataContent(content)
          if (updated) {
            updatedContent.push(updated)
          }
        }
        domainMessages.push({ ...rest, content: await Promise.all(updatedContent) } as DomainMessage)
      }
    }
    return domainMessages
  }

  private async messageContextToReference(messages: DomainMessage[]): Promise<DomainMessage[]> {
    const fileService = await this.resolver.resolveFileService()
    const domainMessages: DomainMessage[] = []
    for (const domainMsg of messages) {
      if (isDomainSystemMessage(domainMsg)) {
        domainMessages.push(domainMsg)
      } else {
        const updatedContent = []
        const { content: originalContent, ...rest } = domainMsg
        for (const content of originalContent) {
          const updated = fileService.dataToReferenceContent(content)
          if (updated) {
            updatedContent.push(updated)
          }
        }
        domainMessages.push({ ...rest, content: await Promise.all(updatedContent) } as DomainMessage)
      }
    }
    return domainMessages
  }

  async runSingleLoop(args: ChatServiceRunSingleLoopArg): Promise<AsyncGenerator<AppStreamEvent>> {
    const { id, message, approvals, resources } = args
    const { userId } = getPrivateContext()

    const chat = await this.chatSource.find("EntityChatStatus", { where: { id, userId } })
    const { data: descOrderMessages } = await this.messageSource.findMany("EntityMessage", {
      where: { chatId: chat.id },
      sortBy: "sequence",
      sortDirection: "desc",
      // Get the latest 100 messages for context, which should be enough for most cases.
      take: 100,
    })

    const messages = descOrderMessages.reverse()
    const userMessageFileDescriptors = await (resources?.descIds?.length
      ? this.fileDescriptorSource.findAll("EntityFileDescriptor", {
          where: { id: { in: resources.descIds }, chats: { some: { id: chat.id, userId } } },
        })
      : Promise.resolve([]))

    // Create context.
    const domainChatStatus = mapChatStatusEntityToDomain(chat)
    const domainMessages = messages.map(mapMessageEntityToDomain)
    const domainFileContainedMessages = await this.messageContextToFile(domainMessages)
    const chatState = buildChatStateFromDomain(domainChatStatus, domainFileContainedMessages)

    // Chat arguments validation and preparation.
    const abortController = new AbortController()
    const eventBus = new EventBus()
    const queue = createAsyncQueue<AppStreamEvent>()

    const onChunk: ChatEngineOnChunkCallback = (chunk) => queue.push({ type: "text", text: chunk })
    const onEvent = async (event: ChatEvent) => {
      const { type } = event
      switch (type) {
        case "agent-start": {
          if (event.ctx.depth > 0) {
            queue.push({ type: "sub-agent-start", agentName: event.agentName })
          }
          break
        }
        case "agent-end": {
          if (event.ctx.depth > 0) {
            queue.push({ type: "sub-agent-end", agentName: event.agentName })
          }
          break
        }
        case "tool-call-start": {
          queue.push({ type: "tool-call-start", toolName: event.toolName })
          break
        }
        case "tool-call-end": {
          queue.push({ type: "tool-call-end", toolName: event.toolName })
          break
        }
        case "tool-call-failed": {
          queue.push({ type: "tool-call-failed", toolName: event.toolName, error: event.error })
          break
        }

        // Handle them in the same way for now,
        // but we can differentiate them in the future if needed.
        case "tool-token-consumed":
          {
            await this.consumedTokenSource.create({
              data: {
                chat: { connect: { id } },
                toolName: event.toolName,
                ...event.tokens,
              },
            })
          }
          break
        case "agent-token-consumed":
          {
            await this.consumedTokenSource.create({
              data: {
                chat: { connect: { id } },
                agentName: event.agentName,
                ...event.tokens,
              },
            })
          }
          break
      }
    }
    eventBus.register(onEvent)

    const engine = await this.resolver.resolveEngine({
      eventBus,
      agents: [
        // exampleAdditionalAgent,
      ],
      tierOverrides: {
        // NOTE: The tier overrides are just an example of how to provide custom configuration for the chat engine.
        // You can adjust or remove it as needed based on your specific requirements.
        coordinator: "medium",
      },
      workingFolder: await this.buildWorkingFolder(),
    })
    engine.registerHooks({ onChunk })

    // Run the engine with appropriate input based on the arguments.
    let loopPromise: Promise<ChatEngineRunResult>
    if (message) {
      const [userMessage] = await this.messageContextToFile([
        {
          // -- Ununsed fields, but need for type compatibility. --
          id: "unused-id",
          isUserFacing: false,
          role: "user",
          // -- Unused end. --
          content: [
            { type: "text", text: message },
            ...userMessageFileDescriptors.map(
              (f) =>
                ({
                  type: "file-ref",
                  mimeType: f.mimeType as MimeType,
                  descId: f.id,
                  blobHash: f.blobHash,
                }) satisfies DomainMessageContentFileRef
            ),
          ],
        },
      ])
      loopPromise = engine.run(userMessage as DomainUserMessage, chatState, { signal: abortController.signal })
    } else if (approvals) {
      const approvalMessage = Object.fromEntries<"approved" | "rejected">(
        approvals.map(({ approvalId, isApproved }) => [approvalId, isApproved ? "approved" : "rejected"])
      )
      loopPromise = engine.resume(approvalMessage, chatState, { signal: abortController.signal })
    } else {
      throw new BadRequestError("Approval and message inputs are not supported in the current implementation.")
    }

    // Clean up and persist state after loop finishes.
    loopPromise
      .then(async ({ chatState: nextState, status }) => {
        const requireApproval = status === "approval_required"
        if (requireApproval) {
          const needApprovals = nextState.pendingApproval?.needApprovals || []
          queue.push({
            type: "chat-request-approval",
            needApprovals: needApprovals.map(mapChatNeedApprovalDomainToApp),
          })
        }

        const { chat: nextChatDomain, messages: nextMessagesDomain } = buildChatStateToDomain(nextState)
        const { interactions, pendingApproval } = mapChatStatusDomainToEntity(nextChatDomain)
        await this.chatSource.update({
          where: { id },
          data: {
            requireApproval,
            interactions,
            pendingApproval,
          },
        })
        const updatedNextMessagesDomain = await this.messageContextToReference(nextMessagesDomain)
        const nextMessagesEntity = updatedNextMessagesDomain.map(mapMessageDomainToEntity)

        let sequence = 0
        for (const msg of nextMessagesEntity) {
          sequence++
          const exists = await this.messageSource.exists({ where: { id: msg.id } })
          if (!exists) {
            await this.messageSource.create({
              data: {
                chat: { connect: { id } },
                sequence,
                ...msg,
              },
            })
          } else {
            // We don't update existing messages.
          }
        }
      })
      .catch((error) => {
        console.error("Error in chat loop:", error)
        abortController.abort()
        queue.push({
          type: "error",
          message: error instanceof BaseError ? error.message : "An unexpected error occurred.",
          errorCode: error instanceof BaseError ? error.errorCode : "UNEXPECTED_ERROR",
        })
      })
      .finally(() => {
        queue.close()
      })

    return queue.iterator()
  }

  private async buildWorkingFolder(args?: { folderId: string }): Promise<AiWorkingFolder | undefined> {
    const { folderId } = args || {}
    let targetFolder: EntityFileDescriptor | null = null
    let parentFolder: EntityFileDescriptor | null = null

    if (folderId) {
      targetFolder = await this.fileDescriptorSource.find("EntityFileDescriptor", { where: { id: folderId } })
    } else {
      // Dafaulting to user's private root folder if no folderId is provided,
      // which ensures that the chat engine always has a working folder to operate with.
      const { userId } = getPrivateContext()
      targetFolder = await this.fileDescriptorSource.find("EntityFileDescriptor", { where: { privateRootOf: { id: userId } } })
    }

    if (targetFolder.parentId) {
      parentFolder = await this.fileDescriptorSource.find("EntityFileDescriptor", { where: { id: targetFolder.parentId } })
    }

    const fileAccessService = await this.resolver.resolveFileService()
    const items = await fileAccessService.getFilesInFolder({ id: targetFolder.id })
    return {
      id: targetFolder.id,
      name: targetFolder.name,
      items: items.data.map((f) => ({ id: f.id, name: f.name, mimeType: f.mimeType as MimeType })),
      parent: parentFolder ?? undefined,
    }
  }
}
