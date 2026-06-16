import { S3Client } from "@aws-sdk/client-s3"
import { PrismaClient } from "@prisma/client"
import { Tool } from "ai"
import { container } from "tsyringe"

import {
  BlobStore,
  FileAccessListener,
  FileAccessService,
  FileAccessServiceImpl,
  LocalBlobStore,
  NoopFileAccessListenerImpl,
} from "@wr/access"
import {
  AgentBuilder,
  AgentProps,
  AgentRegistry,
  ChatEngine,
  CoreConfig,
  EventBus,
  ToolDeleteDir,
  ToolDeleteFile,
  ToolFindFileByName,
  ToolFindFileByText,
  ToolListDir,
  ToolMakeDir,
  ToolMoveFile,
  ToolReadImageFile,
  ToolReadPdfFile,
  ToolReadTextFile,
  ToolRegistry,
  ToolWebSearch,
  ToolWriteAppend,
  ToolWriteNewFile,
  ToolWriteReplace,
  agentCoordinator,
  agentHeavy,
  coreConfig,
} from "@wr/core"
import {
  AccessGroupSource,
  AccessGroupSourceImpl,
  ChatSource,
  ChatSourceImpl,
  ConsumedTokenSource,
  ConsumedTokenSourceImpl,
  FileDescriptorSource,
  FileDescriptorSourceImpl,
  FileHistorySource,
  FileHistorySourceImpl,
  LocalSessionSource,
  LocalSessionSourceImpl,
  MessageSource,
  MessageSourceImpl,
  TenantSource,
  TenantSourceImpl,
  TokenUsageOnTenantSource,
  TokenUsageOnTenantSourceImpl,
  TokenUsageOnUserSource,
  TokenUsageOnUserSourceImpl,
  UserSource,
  UserSourceImpl,
  createPrismaClient,
} from "@wr/db"
import { AiVendorConfigs } from "@wr/shared"
import { DiContainerContext, getDiContainerStore } from "@wr/shared-node"

// AWS S3 Client. This is used by the FileAccessServiceImpl for file storage.
container.register<S3Client>("S3Client", { useValue: new S3Client({}) })

// Prisma Client.
// Override this when testing.
container.register<PrismaClient>("PrismaClient", { useFactory: () => createPrismaClient() })

// Sources.
container.register<TenantSource>("TenantSource", { useClass: TenantSourceImpl })
container.register<UserSource>("UserSource", { useClass: UserSourceImpl })
container.register<LocalSessionSource>("LocalSessionSource", { useClass: LocalSessionSourceImpl })
container.register<FileDescriptorSource>("FileDescriptorSource", { useClass: FileDescriptorSourceImpl })
container.register<FileHistorySource>("FileHistorySource", { useClass: FileHistorySourceImpl })
container.register<MessageSource>("MessageSource", { useClass: MessageSourceImpl })
container.register<ChatSource>("ChatSource", { useClass: ChatSourceImpl })
container.register<AccessGroupSource>("AccessGroupSource", { useClass: AccessGroupSourceImpl })
container.register<ConsumedTokenSource>("ConsumedTokenSource", { useClass: ConsumedTokenSourceImpl })
container.register<TokenUsageOnTenantSource>("TokenUsageOnTenantSource", { useClass: TokenUsageOnTenantSourceImpl })
container.register<TokenUsageOnUserSource>("TokenUsageOnUserSource", { useClass: TokenUsageOnUserSourceImpl })

// Services for local setting.
container.register<FileAccessService>("FileAccessService", { useClass: FileAccessServiceImpl })
container.register<BlobStore>("BlobStore", { useClass: LocalBlobStore })

container.register<CoreConfig>("CoreConfig", { useValue: coreConfig })

container.register<ChatEngine>("ChatEngine", { useClass: ChatEngine })
container.register<EventBus>("EventBus", { useClass: EventBus })
container.register<AiVendorConfigs>("AiVendorConfigs", { useValue: {} })
container.register<Record<string, unknown>>("ToolConfigs", { useValue: {} })

// Default Agents
container.register<AgentBuilder>("AgentBuilder", { useClass: AgentBuilder })
container.register<AgentProps>("AgentProps", { useValue: agentCoordinator })
container.register<AgentProps>("AgentProps", { useValue: agentHeavy })

// Externally Defined Agents
container.register<AgentProps[]>("AdditionalAgents", { useValue: [] })

// Agent Registry
container.register<AgentRegistry>("AgentRegistry", { useClass: AgentRegistry })

// Tools
container.register<Tool>("Tool", { useClass: ToolWebSearch })
container.register<Tool>("Tool", { useClass: ToolListDir })
container.register<Tool>("Tool", { useClass: ToolMoveFile })
container.register<Tool>("Tool", { useClass: ToolWriteNewFile })
container.register<Tool>("Tool", { useClass: ToolWriteAppend })
container.register<Tool>("Tool", { useClass: ToolDeleteFile })
container.register<Tool>("Tool", { useClass: ToolWriteReplace })
container.register<Tool>("Tool", { useClass: ToolReadImageFile })
container.register<Tool>("Tool", { useClass: ToolReadTextFile })
container.register<Tool>("Tool", { useClass: ToolReadPdfFile })
container.register<Tool>("Tool", { useClass: ToolMakeDir })
container.register<Tool>("Tool", { useClass: ToolDeleteDir })
container.register<Tool>("Tool", { useClass: ToolFindFileByText })
container.register<Tool>("Tool", { useClass: ToolFindFileByName })

// Externally Defined Tools.
container.register<Tool[]>("AdditionalTools", { useValue: [] })

// Resolver
container.register<ToolRegistry>("ToolRegistry", { useClass: ToolRegistry })

// Listener
container.register<FileAccessListener>("FileAccessListener", { useClass: NoopFileAccessListenerImpl }) // Placeholder.

export function getDiContainer(): DiContainerContext {
  const containerOrUndefined = getDiContainerStore()
  return containerOrUndefined ?? container
}
