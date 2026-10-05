import z from "zod"

import { McpClient, McpServerConnection, McpToolResult } from "@wr/integration"
import { BadRequestError, DomainMcpServerTool, DomainMessageContentToolCall, DomainToolType } from "@wr/shared"
import { randomId } from "@wr/shared-node"

import { Tool, ToolIncomingChange, ToolRunArgs, ToolRunResult } from "../base"

// LLM APIs only accept Tool names matching ^[a-zA-Z0-9_-]{1,64}$.
const TOOL_NAME_MAX_LENGTH = 64

const sanitizeNamePart = (name: string) => name.replace(/[^a-zA-Z0-9_-]/g, "_")

// Converts the JSON Schema from tools/list into a zod schema.
// Falls back to accepting any object if the schema can not be converted, and lets the MCP server validate the input.
const buildInputSchema = (inputSchema: Record<string, unknown>): z.ZodType => {
  try {
    return z.fromJSONSchema(inputSchema as Parameters<typeof z.fromJSONSchema>[0])
  } catch {
    return z.record(z.string(), z.unknown())
  }
}

// Joins the text content of a tools/call result. Other content types (image, audio, resources) can not be stored
// in a Tool Message, so they are replaced with a short note.
const buildOutputText = (result: McpToolResult): string => {
  const texts = result.content.map((c) => (c.type === "text" && typeof c.text === "string" ? c.text : `[${c.type} content omitted]`))
  if (texts.length === 0 && result.structuredContent) {
    return JSON.stringify(result.structuredContent)
  }
  return texts.join("\n")
}

/**
 * A Tool provided by an MCP server registered by the User.
 * Unlike other Tools, one instance is created per Tool definition, since the name and input schema are only known at runtime.
 */
export class ToolMcp extends Tool {
  name: string
  description: string
  needApproval: boolean
  inputSchema: z.ZodType
  toolType: DomainToolType

  constructor(
    private readonly server: McpServerConnection,
    private readonly definition: DomainMcpServerTool,
    private readonly mcpClient: McpClient
  ) {
    super()
    this.name = ToolMcp.buildName(server.name, definition.name)
    this.description = `[MCP server: ${server.name}] ${definition.description ?? definition.name}`
    this.inputSchema = buildInputSchema(definition.inputSchema)
    // Only Tools the MCP server reports as read-only run without approval.
    // Without annotations, a Tool is treated as one that may modify its environment, following the MCP spec's defaults.
    const readOnly = definition.annotations?.readOnlyHint === true
    this.needApproval = !readOnly
    // "delete" only when the server explicitly marks the Tool as destructive, so the approval message is not alarming
    // for the many Tools without annotations.
    this.toolType = readOnly ? "read" : definition.annotations?.destructiveHint === true ? "delete" : "edit"
  }

  // Builds the Tool name exposed to the LLM, e.g. "mcp__github__create_issue".
  static buildName(serverName: string, toolName: string): string {
    return `mcp__${sanitizeNamePart(serverName)}__${sanitizeNamePart(toolName)}`.slice(0, TOOL_NAME_MAX_LENGTH)
  }

  public async getChangeDescription(toolCall: DomainMessageContentToolCall): Promise<ToolIncomingChange> {
    const input = this.inputSchema.safeParse(toolCall.input)
    if (!input.success) {
      throw new BadRequestError(`Invalid input: ${input.error.message}`)
    }
    return {
      change: `+MCP server: ${this.server.name}\n+Tool: ${this.definition.name}\n+Input: ${JSON.stringify(input.data, null, 2)}`,
    }
  }

  async run({ toolCall }: ToolRunArgs): Promise<ToolRunResult> {
    const { toolCallId, toolName } = toolCall
    const input = this.inputSchema.safeParse(toolCall.input)
    if (!input.success) {
      return { message: this.buildError(toolCall, `Invalid input: ${input.error.message}`) }
    }

    try {
      const result = await this.mcpClient.callTool(this.server, {
        name: this.definition.name,
        arguments: (input.data ?? {}) as Record<string, unknown>,
      })
      const text = buildOutputText(result)
      if (result.isError) {
        return { message: this.buildError(toolCall, text) }
      }
      return {
        message: {
          id: randomId(),
          role: "tool",
          content: [
            {
              type: "tool-result",
              toolCallId,
              toolName,
              output: { type: "text", value: text },
            },
          ],
        },
      }
    } catch (e) {
      return {
        message: this.buildError(
          toolCall,
          `Failed to call the MCP Tool "${this.definition.name}" on "${this.server.name}": ${e instanceof Error ? e.message : String(e)}`
        ),
      }
    }
  }
}
