import { tool as aiTool } from "ai"
import { inject, injectAll, injectable } from "tsyringe"

import { AiVendorConfigs, DomainToolDef } from "@wr/shared"

import type { Tool } from "./base"

@injectable()
export class ToolRegistry {
  private tools: Map<string, Tool> = new Map([])

  constructor(
    @inject("AiVendorConfigs") private aiVendorConfigs: AiVendorConfigs,
    @injectAll("Tool") tools: Tool[],
    // User-Defined Tools
    @inject("AdditionalTools") additionalTools: Tool[]
  ) {
    tools.forEach((t) => this.register(t))
    additionalTools.forEach((t) => this.register(t))
  }

  register(tool: Tool) {
    this.tools.set(tool.name, tool)
  }

  get(name: string): Tool {
    const tool = this.tools.get(name)
    if (!tool) {
      throw new Error(`Tool of name ${name} not found`)
    }
    return tool
  }

  toAiTool(tool: Tool): DomainToolDef {
    return aiTool({
      description: tool.description,
      inputSchema: tool.inputSchema,
    })
  }

  getAsAiTools(): Record<string, DomainToolDef> {
    const tools = Array.from(this.tools.values())
    return Object.fromEntries(tools.map((t) => [t.name, this.toAiTool(t)]))
  }

  needApproval(name: string): boolean {
    const tool = this.get(name)
    return !!tool.needApproval
  }
}
