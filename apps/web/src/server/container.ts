import "reflect-metadata"

import { FileAccessListener } from "@wr/access"
import { getDiContainer } from "@wr/composition"
import { DiContainerContext, getDiContainerStore } from "@wr/shared-node"

import { AuthServiceImpl } from "../server/services/auth"
import { AuthService } from "../server/services/authType"
import { FileAccessListenerImpl } from "./listener/file"
import { Resolver } from "./resolver"
import { AccessGroupServiceImpl } from "./services/accessGroup"
import { AccessGroupService } from "./services/accessGroupType"
import { AgentServiceImpl } from "./services/agent"
import { AgentService } from "./services/agentType"
import { ChatServiceImpl } from "./services/chat"
import { ChatService } from "./services/chatType"
import { FileServiceImpl } from "./services/file"
import { FileService } from "./services/fileType"
import { TenantServiceImpl } from "./services/tenant"
import { TenantService } from "./services/tenantType"
import { UserServiceImpl } from "./services/user"
import { UserService } from "./services/userType"
import { AuthSource } from "./sources/authType"
import { LocalAuthSourceImpl } from "./sources/localAuth"

const container = getDiContainer().createChildContainer()

// You can change this "LocalAuthSourceImpl" injection to switch authentication source,
// for example, to use an external OAuth provider instead of local authentication.
container.register<AuthSource>("AuthSource", { useClass: LocalAuthSourceImpl })

container.register<AuthService>("AuthService", { useClass: AuthServiceImpl })
container.register<ChatService>("ChatService", { useClass: ChatServiceImpl })
container.register<TenantService>("TenantService", { useClass: TenantServiceImpl })
container.register<UserService>("UserService", { useClass: UserServiceImpl }) // Assuming UserServiceImpl is the same as TenantServiceImpl for this example. Replace with actual UserServiceImpl if different.
container.register<AccessGroupService>("AccessGroupService", { useClass: AccessGroupServiceImpl })
container.register<FileService>("FileService", { useClass: FileServiceImpl })
container.register<AgentService>("AgentService", { useClass: AgentServiceImpl })

// Resolver registrations
// You need to use file service resolver to use FileService.
// Resolvers injects runtime context (access control policies, etc.) into the service implementation.
container.register<Resolver>("Resolver", { useClass: Resolver })

// Listener registrations
container.register<FileAccessListener>("FileAccessListener", { useClass: FileAccessListenerImpl })

// Container helpers.

export function getWebAppDiContainer(): DiContainerContext {
  const containerOrUndefined = getDiContainerStore()
  return containerOrUndefined ?? container
}
