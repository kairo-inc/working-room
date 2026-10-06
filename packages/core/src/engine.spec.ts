import { describe, expect, it, vi } from "vitest"
import z from "zod"

import { AiVendorConfigs, DomainAssistantMessage, DomainMessageContent, DomainToolType } from "@wr/shared"

import { Agent } from "./agent/base"
import { AgentRegistry } from "./agent/registry"
import { ChatEngine } from "./engine"
import { EventBus } from "./event/bus"
import { Tool, ToolRunArgs, ToolRunResult } from "./tool/base"
import { ToolRegistry } from "./tool/registry"
import { ChatEngineConfig } from "./types/engine"

// A Tool with side effects, so it requires approval.
class ToolFakeWrite extends Tool {
  name = "ToolFakeWrite"
  description = "Writes something."
  needApproval = true
  inputSchema = z.object({})
  toolType: DomainToolType = "create"
  run = vi.fn(async ({ toolCall }: ToolRunArgs): Promise<ToolRunResult> => {
    return {
      message: {
        id: "tool-result",
        role: "tool",
        content: [
          { type: "tool-result", toolCallId: toolCall.toolCallId, toolName: toolCall.toolName, output: { type: "text", value: "written" } },
        ],
      },
    }
  })
}

const toolCall = (toolName: string, input: unknown = {}): DomainMessageContent => ({
  type: "tool-call",
  toolCallId: `call-${toolName}`,
  toolName,
  input,
})

// An Agent that returns the given responses in order, instead of calling an LLM.
const buildScriptedAgent = (name: string, responses: DomainMessageContent[][]) => {
  const queue = [...responses]
  return {
    name,
    run: vi.fn(async () => ({
      message: {
        id: `${name}-${queue.length}`,
        role: "assistant",
        content: queue.shift() ?? [{ type: "text", text: "done" }],
      } as DomainAssistantMessage,
    })),
  } as unknown as Agent
}

const buildEngine = (config: ChatEngineConfig, agents: { main: Agent; sub?: Agent }) => {
  const tool = new ToolFakeWrite()
  const toolRegistry = new ToolRegistry({} as AiVendorConfigs, [tool], [], [])
  const agentRegistry = {
    get: (name: string) => (name === agents.sub?.name ? agents.sub : agents.main),
    getUserFacingAgent: () => agents.main,
    getSpawnableAgents: () => (agents.sub ? [{ ...agents.sub, description: "Sub agent." }] : []),
  } as unknown as AgentRegistry
  return { engine: new ChatEngine(new EventBus(), toolRegistry, agentRegistry, config), tool }
}

const prompt = { role: "user" as const, content: [{ type: "text" as const, text: "Write it." }] }

describe("ChatEngine auto-approve", () => {
  it("[Success] Pauses for approval when auto-approve is off", async () => {
    const main = buildScriptedAgent("coordinator", [[toolCall("ToolFakeWrite")]])
    const { engine, tool } = buildEngine({}, { main })

    const result = await engine.run(prompt)

    expect(result.status).toBe("approval_required")
    expect(result.chatState.pendingApproval?.needApprovals.map((a) => a.toolCall.toolName)).toEqual(["ToolFakeWrite"])
    expect(tool.run).not.toHaveBeenCalled()
  })

  it("[Success] Runs Tool calls that require approval without pausing when auto-approve is on", async () => {
    const main = buildScriptedAgent("coordinator", [[toolCall("ToolFakeWrite")], [{ type: "text", text: "Finished." }]])
    const { engine, tool } = buildEngine({ autoApprove: true }, { main })

    const result = await engine.run(prompt)

    expect(result).toMatchObject({ status: "done", text: "Finished." })
    expect(result.chatState.pendingApproval).toBeUndefined()
    expect(tool.run).toHaveBeenCalledOnce()
  })

  it("[Success] Still rejects Tool calls that require approval from sub-agents when auto-approve is on", async () => {
    const main = buildScriptedAgent("coordinator", [
      [toolCall("spawn_agent", { agentName: "sub", task: "Write it." })],
      [{ type: "text", text: "Finished." }],
    ])
    const sub = buildScriptedAgent("sub", [[toolCall("ToolFakeWrite")], [{ type: "text", text: "Could not write." }]])
    const { engine, tool } = buildEngine({ autoApprove: true }, { main, sub })

    const result = await engine.run(prompt)

    expect(result.status).toBe("done")
    expect(tool.run).not.toHaveBeenCalled()
    // The sub-agent ran, and was told it can not call the Tool instead of having it approved.
    expect(sub.run).toHaveBeenCalledTimes(2)
    const secondCallMessages = vi.mocked(sub.run).mock.calls[1]![0].ctx.messages
    expect(JSON.stringify(secondCallMessages)).toContain("can not invoke ToolFakeWrite")
  })
})
