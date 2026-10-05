import { PrismaClient } from "@prisma/client"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { CoreConfig } from "@wr/core"
import { McpClient } from "@wr/integration"
import { AlreadyExistsError, DomainMcpServerTool, McpServerAuthError, McpServerConnectionError, NotFoundError } from "@wr/shared"
import { runWithDiContainer, runWithPrivateContext } from "@wr/shared-node"
import { fixtureFactory } from "@wr/testing"

import { getWebAppDiContainer } from "../container"
import { McpServerService } from "./mcpServerType"

const tools: DomainMcpServerTool[] = [
  { name: "list_issues", inputSchema: { type: "object" }, annotations: { readOnlyHint: true } },
  { name: "create_issue", inputSchema: { type: "object" } },
]

describe("McpServerService", () => {
  let testContainer: ReturnType<typeof getWebAppDiContainer>
  let prismaClient: PrismaClient
  let config: CoreConfig
  let mcpClient: McpClient

  beforeEach(async () => {
    testContainer = getWebAppDiContainer().createChildContainer()
    config = fixtureFactory.createTestConfigWithTmpFolder()
    prismaClient = await fixtureFactory.createDbClient()
    mcpClient = { listTools: vi.fn().mockResolvedValue(tools), callTool: vi.fn() } as McpClient
    testContainer.registerInstance<CoreConfig>("CoreConfig", config)
    testContainer.registerInstance<PrismaClient>("PrismaClient", prismaClient)
    testContainer.registerInstance<McpClient>("McpClient", mcpClient)
  })

  afterEach(async () => {
    await fixtureFactory.resetDatabase()
    await fixtureFactory.removeTestFolder(config)
  })

  it("[Success] Fetches and caches the Tools when adding a server, without exposing the access token", async () => {
    const { user } = await fixtureFactory.createTenantWithOwner()
    await runWithDiContainer(testContainer, async () => {
      const service = testContainer.resolve<McpServerService>("McpServerService")
      const result = await runWithPrivateContext({ idToken: user.idToken }, () =>
        service.create({ name: "github", url: "https://example.com/mcp", accessToken: "secret" })
      )

      expect(mcpClient.listTools).toHaveBeenCalledWith({ name: "github", url: "https://example.com/mcp", accessToken: "secret" })
      expect(result).toMatchObject({ name: "github", hasAccessToken: true, enabled: true, toolNames: ["list_issues", "create_issue"] })
      expect(result).not.toHaveProperty("accessToken")
      expect(result.toolsFetchedAt).toBeInstanceOf(Date)

      const entity = await prismaClient.mcpServer.findUniqueOrThrow({ where: { id: result.id } })
      expect(entity.accessToken).toBe("secret")
      expect(JSON.parse(entity.tools)).toEqual(tools)
    })
  })

  it("[Failure] Does not save the server when it can not be reached", async () => {
    const { user } = await fixtureFactory.createTenantWithOwner()
    vi.mocked(mcpClient.listTools).mockRejectedValue(new McpServerConnectionError("connect ECONNREFUSED"))
    vi.spyOn(console, "error").mockImplementation(() => {})
    await runWithDiContainer(testContainer, async () => {
      const service = testContainer.resolve<McpServerService>("McpServerService")
      const result = runWithPrivateContext({ idToken: user.idToken }, () =>
        service.create({ name: "github", url: "https://example.com/mcp" })
      )

      await expect(result).rejects.toThrow(McpServerConnectionError)
      expect(await prismaClient.mcpServer.count()).toBe(0)
    })
  })

  it("[Failure] Reports a rejected access token separately from a connection failure", async () => {
    const { user } = await fixtureFactory.createTenantWithOwner()
    vi.mocked(mcpClient.listTools).mockRejectedValue(new McpServerAuthError("HTTP 401"))
    vi.spyOn(console, "error").mockImplementation(() => {})
    await runWithDiContainer(testContainer, async () => {
      const service = testContainer.resolve<McpServerService>("McpServerService")
      const result = runWithPrivateContext({ idToken: user.idToken }, () =>
        service.create({ name: "github", url: "https://example.com/mcp", accessToken: "wrong" })
      )

      await expect(result).rejects.toThrow(McpServerAuthError)
    })
  })

  it("[Failure] Reports an unexpected error from the MCP server as a connection failure", async () => {
    const { user } = await fixtureFactory.createTenantWithOwner()
    vi.mocked(mcpClient.listTools).mockRejectedValue(new Error("Unexpected response"))
    vi.spyOn(console, "error").mockImplementation(() => {})
    await runWithDiContainer(testContainer, async () => {
      const service = testContainer.resolve<McpServerService>("McpServerService")
      const result = runWithPrivateContext({ idToken: user.idToken }, () =>
        service.create({ name: "github", url: "https://example.com/mcp" })
      )

      await expect(result).rejects.toThrow(McpServerConnectionError)
    })
  })

  it("[Failure] Rejects a name already used by the same User", async () => {
    const { user } = await fixtureFactory.createTenantWithOwner()
    await runWithDiContainer(testContainer, async () => {
      const service = testContainer.resolve<McpServerService>("McpServerService")
      await runWithPrivateContext({ idToken: user.idToken }, async () => {
        await service.create({ name: "github", url: "https://example.com/mcp" })
        await expect(service.create({ name: "github", url: "https://other.example.com/mcp" })).rejects.toThrow(AlreadyExistsError)
      })
    })
  })

  it("[Success] Fetches the Tools again only when the URL or access token changes", async () => {
    const { user } = await fixtureFactory.createTenantWithOwner()
    await runWithDiContainer(testContainer, async () => {
      const service = testContainer.resolve<McpServerService>("McpServerService")
      await runWithPrivateContext({ idToken: user.idToken }, async () => {
        const server = await service.create({ name: "github", url: "https://example.com/mcp", accessToken: "secret" })
        vi.mocked(mcpClient.listTools).mockClear()

        const disabled = await service.edit({ id: server.id, enabled: false })
        expect(disabled.enabled).toBe(false)
        expect(mcpClient.listTools).not.toHaveBeenCalled()

        const removedToken = await service.edit({ id: server.id, accessToken: null })
        expect(removedToken.hasAccessToken).toBe(false)
        expect(mcpClient.listTools).toHaveBeenCalledWith({ name: "github", url: "https://example.com/mcp", accessToken: null })
      })
    })
  })

  it("[Failure] Can not see or change the servers of another User in the same Tenant", async () => {
    const { user: owner, memberUser: other } = await fixtureFactory.createTenantWithOwnerAndOtherUsers()
    await runWithDiContainer(testContainer, async () => {
      const service = testContainer.resolve<McpServerService>("McpServerService")
      const server = await runWithPrivateContext({ idToken: owner.idToken }, () =>
        service.create({ name: "github", url: "https://example.com/mcp" })
      )

      await runWithPrivateContext({ idToken: other.idToken }, async () => {
        expect(await service.getList()).toEqual([])
        await expect(service.edit({ id: server.id, enabled: false })).rejects.toThrow(NotFoundError)
        await expect(service.refreshTools({ id: server.id })).rejects.toThrow(NotFoundError)
        await expect(service.delete({ id: server.id })).rejects.toThrow(NotFoundError)
      })
      expect(await prismaClient.mcpServer.count()).toBe(1)
    })
  })

  it("[Success] Deletes the server physically", async () => {
    const { user } = await fixtureFactory.createTenantWithOwner()
    await runWithDiContainer(testContainer, async () => {
      const service = testContainer.resolve<McpServerService>("McpServerService")
      await runWithPrivateContext({ idToken: user.idToken }, async () => {
        const server = await service.create({ name: "github", url: "https://example.com/mcp", accessToken: "secret" })
        await service.delete({ id: server.id })
      })
      expect(await prismaClient.mcpServer.count()).toBe(0)
    })
  })
})
