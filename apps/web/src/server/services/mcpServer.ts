import { inject, injectable } from "tsyringe"

import { EntityMcpServer, McpServerSource, mapMcpServerEntityToDomain } from "@wr/db"
import { McpClient, McpServerConnection } from "@wr/integration"
import { AlreadyExistsError, DomainMcpServerTool, McpServerAuthError, McpServerConnectionError } from "@wr/shared"
import { getPrivateContext } from "@wr/shared-node"

import { mapMcpServerDomainToApp } from "../../map/mcpServer"
import { AppMcpServer } from "../../types/mcpServer"
import {
  McpServerService,
  McpServerServiceCreateArgs,
  McpServerServiceDeleteArgs,
  McpServerServiceEditArgs,
  McpServerServiceRefreshToolsArgs,
} from "./mcpServerType"

const toApp = (entity: EntityMcpServer) => mapMcpServerDomainToApp(mapMcpServerEntityToDomain(entity))

@injectable()
export class McpServerServiceImpl extends McpServerService {
  constructor(
    @inject("McpServerSource") private mcpServerSource: McpServerSource,
    @inject("McpClient") private mcpClient: McpClient
  ) {
    super()
  }

  async getList(): Promise<AppMcpServer[]> {
    const { userId } = getPrivateContext()
    const records = await this.mcpServerSource.findAll("EntityMcpServer", { where: { userId }, sortBy: "createdAt" })
    return records.map(toApp)
  }

  async create(args: McpServerServiceCreateArgs): Promise<AppMcpServer> {
    const { name, url, accessToken } = args
    const { userId } = getPrivateContext()
    await this.assertNameIsAvailable(userId, name)

    const tools = await this.fetchTools({ name, url, accessToken: accessToken ?? null })
    const record = await this.mcpServerSource.create({
      data: {
        name,
        url,
        accessToken: accessToken ?? null,
        tools: JSON.stringify(tools),
        toolsFetchedAt: new Date(),
        user: { connect: { id: userId } },
      },
    })
    return toApp(record)
  }

  async edit(args: McpServerServiceEditArgs): Promise<AppMcpServer> {
    const { id, name, url, accessToken, enabled } = args
    const { userId } = getPrivateContext()
    const current = await this.mcpServerSource.find("EntityMcpServer", { where: { id, userId } })
    if (name !== undefined && name !== current.name) {
      await this.assertNameIsAvailable(userId, name)
    }

    const data: Parameters<typeof this.mcpServerSource.update>[0]["data"] = { name, url, enabled }
    if (accessToken !== undefined) {
      data.accessToken = accessToken
    }

    // The cached Tool definitions belong to the old connection, so fetch them again with the new one.
    const connectionChanged =
      (url !== undefined && url !== current.url) || (accessToken !== undefined && accessToken !== current.accessToken)
    if (connectionChanged) {
      const tools = await this.fetchTools({
        name: name ?? current.name,
        url: url ?? current.url,
        accessToken: accessToken !== undefined ? accessToken : current.accessToken,
      })
      data.tools = JSON.stringify(tools)
      data.toolsFetchedAt = new Date()
    }

    const record = await this.mcpServerSource.update({ where: { id, userId, deletedAt: null }, data })
    return toApp(record)
  }

  async delete(args: McpServerServiceDeleteArgs): Promise<void> {
    const { id } = args
    const { userId } = getPrivateContext()
    // Deleted physically, since the record holds the User's access token.
    await this.mcpServerSource.delete({ where: { id, userId }, physically: true })
  }

  async refreshTools(args: McpServerServiceRefreshToolsArgs): Promise<AppMcpServer> {
    const { id } = args
    const { userId } = getPrivateContext()
    const current = await this.mcpServerSource.find("EntityMcpServer", { where: { id, userId } })
    const tools = await this.fetchTools(current)
    const record = await this.mcpServerSource.update({
      where: { id, userId, deletedAt: null },
      data: { tools: JSON.stringify(tools), toolsFetchedAt: new Date() },
    })
    return toApp(record)
  }

  // The server name is part of the Tool names exposed to the LLM, so it must be unique per User.
  private async assertNameIsAvailable(userId: string, name: string) {
    if (await this.mcpServerSource.exists({ where: { userId, name } })) {
      throw new AlreadyExistsError(`An MCP server named "${name}" already exists.`)
    }
  }

  private async fetchTools(server: McpServerConnection): Promise<DomainMcpServerTool[]> {
    try {
      return await this.mcpClient.listTools(server)
    } catch (e) {
      console.error(`Failed to fetch Tools from the MCP server "${server.name}" (${server.url}):`, e)
      // Auth and connection errors are passed through, so the User can tell whether the token or the URL is wrong.
      if (e instanceof McpServerAuthError || e instanceof McpServerConnectionError) {
        throw e
      }
      throw new McpServerConnectionError(`Could not fetch Tools from the MCP server "${server.name}".`, { cause: e })
    }
  }
}
