import { tool } from "ai"
import { inject, injectable } from "tsyringe"
import z from "zod"

import type {
  DomainAgentInteraction,
  DomainMessage,
  DomainMessageContentMeta,
  DomainMessageContentToolCall,
  DomainNeedApproval,
  DomainPendingApproval,
  DomainToolMessage,
  DomainUserMessage,
} from "@wr/shared"
import { BadRequestError, ChatAbortError, MaximumAgentCallExceededError } from "@wr/shared"
import { randomId } from "@wr/shared-node"

import { AgentRegistry } from "./agent/registry"
import { EventBus } from "./event/bus"
import { ToolRegistry } from "./tool/registry"
import { AgentContext, ChatState, PendingApprovalSignal } from "./types/chat"
import { ChatEngineConfig, ChatEngineHooks, ChatEngineRunResult } from "./types/engine"

const MAX_AGENT_DEPTH = 5
const MAX_ITERATIONS = 10

type AgentRunResult = { type: "text"; text: string } | { type: "done" }

const spawnAgentInputSchema = z.object({
  agentName: z.string().describe("Name of the agent to spawn"),
  task: z.string().describe("Task description for the sub-agent"),
})

const createChatState = (): ChatState => ({
  chatId: randomId(),
  interactions: [],
  conversationHistory: [],
})

@injectable()
export class ChatEngine {
  private hooks?: ChatEngineHooks

  constructor(
    @inject("EventBus") private eventBus: EventBus,
    @inject("ToolRegistry") private toolRegistry: ToolRegistry,
    @inject("AgentRegistry") private agentRegistry: AgentRegistry,
    @inject("ChatEngineConfig") private config: ChatEngineConfig
  ) {}

  public registerHooks(hooks: ChatEngineHooks) {
    this.hooks = hooks
  }

  async run(
    prompt: Omit<DomainUserMessage, "id">,
    chatState?: ChatState,
    options?: { signal?: AbortSignal }
  ): Promise<ChatEngineRunResult> {
    const startWorkspace = chatState ?? createChatState()

    // Start single chat loop event.
    await this.eventBus.emit({ type: "chat-loop-start", chatState: startWorkspace })

    // Remove seconds to shorten the text.
    const now = new Date().toLocaleString().slice(0, -3)

    // Attach meta information about the message, such as the timestamp, so agents can use it for reasoning
    // without needing to call a tool to get the current time.
    const userMetaContent: DomainMessageContentMeta = {
      type: "meta",
      text: `<meta>time=${now}</meta>`,
    }
    const userPrompt: DomainUserMessage = {
      id: randomId(),
      role: "user",
      isUserFacing: true,
      content: [userMetaContent, ...prompt.content],
    }

    // Call agent loop.
    const result = await this.runInternal(startWorkspace, userPrompt, options?.signal)

    // End single chat loop event.
    await this.eventBus.emit({ type: "chat-loop-end", chatState: result.chatState })

    return result
  }

  async resume(
    decisions: Record<string, "approved" | "rejected">,
    chatState: ChatState,
    options?: { signal?: AbortSignal }
  ): Promise<ChatEngineRunResult> {
    // Check if the chatState has pending approvals and if decisions for all pending approvals are provided.
    // If not, emit a "chat-resume-failed" event and throw an error.
    const { pendingApproval } = chatState
    const hasAllDecisions = pendingApproval?.needApprovals.every((p) => decisions[p.approvalId])
    if (!pendingApproval) {
      await this.eventBus.emit({ type: "chat-resume-failed", chatState })
      throw new BadRequestError("No pending approval in chatState")
    } else if (!hasAllDecisions) {
      await this.eventBus.emit({ type: "chat-resume-failed", chatState })
      throw new BadRequestError("Decisions for all pending approvals must be provided")
    }

    // NOTE: Clear pending approval before resuming the agent loop.
    const { agentName, needApprovals, otherToolCalls } = pendingApproval
    chatState.pendingApproval = undefined

    const ctx = this.buildCtxFromHistory(chatState, agentName)

    const rejectedResults: DomainToolMessage[] = []
    const approvedResults: Promise<DomainToolMessage>[] = []

    for (const [approvalId, decision] of Object.entries(decisions)) {
      const { toolCall } = needApprovals.find((p) => p.approvalId === approvalId)!
      await this.eventBus.emit({ type: "chat-resume", chatState, decision, ctx, toolCall })

      if (decision === "rejected") {
        rejectedResults.push({
          id: randomId(),
          role: "tool",
          content: [
            {
              type: "tool-result",
              toolCallId: toolCall.toolCallId,
              toolName: toolCall.toolName,
              output: {
                type: "execution-denied",
                reason: `User decided to reject the tool call ${toolCall.toolName} with the input value ${JSON.stringify(toolCall.input)}.`,
              },
            },
          ],
        })
      } else if (decision === "approved") {
        approvedResults.push(this.runTool(toolCall, ctx, chatState))
      } else {
        await this.eventBus.emit({ type: "chat-resume-failed", chatState })
        throw new BadRequestError(`Invalid decision "${decision}" for approvalId ${approvalId}`)
      }
    }

    // Gather all tool results (both approved and automatically executed) into a single message and append to the conversation history,
    // so the agent can see the results in the next turn.
    const allResults = await Promise.all([
      // Approved tool calls.
      ...approvedResults,
      // Automatically executed tool calls that do not require approval.
      ...otherToolCalls.map((tc) => this.runTool(tc, ctx, chatState)),
    ])
    chatState.conversationHistory.push({
      id: randomId(),
      role: "tool",
      content: [...rejectedResults, ...allResults].flatMap((m) => m.content),
    })

    return await this.runInternal(chatState, undefined, options?.signal)
  }

  private async runInternal(chatState: ChatState, newPrompt?: DomainUserMessage, signal?: AbortSignal): Promise<ChatEngineRunResult> {
    const agentName = this.agentRegistry.getUserFacingAgent().name
    const messages: DomainMessage[] = newPrompt ? [...chatState.conversationHistory, newPrompt] : [...chatState.conversationHistory]
    const ctx: AgentContext = { agentId: randomId(), agentName, depth: 0, messages }

    const interaction = this.openInteraction(chatState, ctx)

    try {
      const result = await this.agentLoop(ctx, chatState, signal)
      chatState.conversationHistory = ctx.messages

      this.closeInteraction(interaction, result)

      const text = result.type === "text" ? result.text : ""
      return { status: "done", text, chatState }
    } catch (e) {
      this.closeInteraction(interaction, null)

      if (e instanceof ChatAbortError) {
        chatState.conversationHistory = ctx.messages
        await this.eventBus.emit({ type: "session-aborted", chatState, ctx })
        return { status: "aborted", chatState }
      } else if (e instanceof PendingApprovalSignal) {
        chatState.conversationHistory = ctx.messages
        return { status: "approval_required", chatState }
      }
      throw e
    }
  }

  // Recursive. Used for sub-agents spawned via spawn_agent (depth > 0).
  private async runAgent(
    agentName: string,
    prompt: DomainUserMessage,
    chatState: ChatState,
    parentAgentId: string | null,
    depth: number
  ): Promise<AgentRunResult> {
    if (depth > MAX_AGENT_DEPTH) throw new MaximumAgentCallExceededError(`Max agent depth (${MAX_AGENT_DEPTH}) exceeded`)

    const ctx: AgentContext = {
      agentId: randomId(),
      depth,
      agentName,
      parentAgentId: parentAgentId ?? undefined,
      messages: [prompt],
    }

    const interaction = this.openInteraction(chatState, ctx)
    try {
      const result = await this.agentLoop(ctx, chatState)
      this.closeInteraction(interaction, result)
      return result
    } catch (e) {
      console.error(`Error in agent "${agentName}" at depth ${depth}:`, e)
      this.closeInteraction(interaction, null)
      throw e
    }
  }

  private async agentLoop(ctx: AgentContext, chatState: ChatState, signal?: AbortSignal): Promise<AgentRunResult> {
    const agent = this.agentRegistry.get(ctx.agentName)
    const tools = this.buildTools(ctx.depth)

    let iterations = 0
    const textContents: string[] = []
    while (true) {
      if (signal?.aborted) throw new ChatAbortError()
      if (iterations++ >= MAX_ITERATIONS) throw new MaximumAgentCallExceededError(`Max iterations (${MAX_ITERATIONS}) exceeded`)

      await this.eventBus.emit({ type: "agent-start", chatState, ctx, agentName: ctx.agentName })

      const isUserFacingTurn = ctx.depth === 0 // This flag means the message will be sent to the user. Sub-agent messages are not user-facing.
      const onChunk = isUserFacingTurn ? this.hooks?.onChunk : undefined
      const { tokens, message: outputs } = await agent.run({ ctx, chatState, tools, config: this.config }, { onChunk })

      if (tokens) await this.eventBus.emit({ type: "agent-token-consumed", chatState, ctx, tokens, agentName: ctx.agentName })

      const textExists = outputs.content.some((c) => c.type === "text" && c.text.trim().length > 0)
      const isUserFacingMessage = isUserFacingTurn && textExists
      this.pushMessageToContext(ctx, { ...outputs, isUserFacing: isUserFacingMessage })

      await this.eventBus.emit({ type: "agent-end", chatState, ctx, agentName: ctx.agentName })

      if (outputs.content.length === 0) return { type: "done" }

      textContents.push(...outputs.content.filter((c): c is { type: "text"; text: string } => c.type === "text").map((c) => c.text))

      // If the output is only text, return it immediately without waiting for tool calls to finish, to improve responsiveness.
      // If there are tool calls, the agent loop will pause and wait for user approval, so it's not necessary to return partial text output.
      const onlyText = outputs.content.every((o) => o.type === "text")
      if (onlyText) return { type: "text", text: textContents.join("\n") }

      // Handle tool calls. If there are any tool calls that require approval, pause the agent loop and wait for user decision.
      const toolCalls = outputs.content.filter((c): c is DomainMessageContentToolCall => c.type === "tool-call")
      const pendingCalls = toolCalls.filter((tc) => tc.toolName !== "spawn_agent" && this.toolRegistry.get(tc.toolName)?.needApproval)
      const otherCalls = toolCalls.filter((tc) => !pendingCalls.includes(tc))
      try {
        if (pendingCalls.length > 0) {
          if (ctx.depth > 0) {
            // Sub-agents can not invoke tools that require approval, since there's no user to approve the tool calls.
            // The main agent is responsible for all tool calls and approvals.
            this.pushMessageToContext(ctx, {
              id: randomId(),
              role: "tool",
              content: pendingCalls.map((tc) => ({
                type: "tool-result",
                toolCallId: tc.toolCallId,
                toolName: tc.toolName,
                output: {
                  type: "error-text",
                  value: `You, a sub-agent, can not invoke ${tc.toolName} that require approval. This action is not allowed.`,
                },
              })),
            })
            continue
          } else {
            // Create diff of tool calls, so the UI can show which tool calls are pending approval and
            // which ones are automatically executed on resume.
            // If any error happens during the diffing or getting base state, the approval preparations and every other tool calls will be cancelled.
            const needApprovals: DomainNeedApproval[] = []
            for (const tc of pendingCalls) {
              const tool = this.toolRegistry.get(tc.toolName)
              const change = await tool.getChangeDescription(tc)
              const baseState = await tool.getBaseState(tc)
              needApprovals.push({
                approvalId: randomId(),
                toolCall: { ...tc, baseState },
                toolType: tool.toolType,
                change,
              })
            }

            const otherToolCalls: DomainMessageContentToolCall[] = []
            for (const tc of otherCalls) {
              if (tc.toolName === "spawn_agent") {
                otherToolCalls.push(tc)
              } else {
                const tool = this.toolRegistry.get(tc.toolName)
                const baseState = await tool.getBaseState(tc)
                otherToolCalls.push({ ...tc, baseState })
              }
            }

            const pendingApproval: DomainPendingApproval = {
              needApprovals,
              otherToolCalls,
              agentName: ctx.agentName,
            }
            chatState.pendingApproval = pendingApproval

            await this.eventBus.emit({ type: "chat-approval-required", chatState, ctx, pendingApproval })

            throw new PendingApprovalSignal()
          }
        }

        // Gather tool results into a single message and append to the conversation history, so the agent can see the results in the next turn.
        const toolResults = await Promise.all(toolCalls.map((tc) => this.runTool(tc, ctx, chatState)))
        this.pushMessageToContext(ctx, { id: randomId(), role: "tool", content: toolResults.flatMap((m) => m.content) })
      } catch (e) {
        if (e instanceof PendingApprovalSignal) {
          throw e
        } else {
          this.pushMessageToContext(ctx, {
            id: randomId(),
            role: "tool",
            content: toolCalls.map((tc) => ({
              type: "tool-result",
              toolCallId: tc.toolCallId,
              toolName: tc.toolName,
              output: { type: "error-text", value: `Error executing tool "${tc.toolName}": ${e instanceof Error ? e.message : String(e)}` },
              isError: true,
            })),
          })
        }
      }
    }
  }

  private async runTool(toolCall: DomainMessageContentToolCall, ctx: AgentContext, chatState: ChatState): Promise<DomainToolMessage> {
    try {
      if (toolCall.toolName === "spawn_agent") return await this.runSpawnAgent(toolCall, ctx, chatState)
      const effect = this.toolRegistry.get(toolCall.toolName)
      await this.eventBus.emit({ type: "tool-call-start", chatState, ctx, toolCallId: toolCall.toolCallId, toolName: toolCall.toolName })
      const { tokens, message: result } = await effect.run({ toolCall, ctx, chatState, config: this.config })
      await this.eventBus.emit({ type: "tool-call-end", chatState, ctx, toolCallId: toolCall.toolCallId, toolName: toolCall.toolName })
      if (tokens) await this.eventBus.emit({ type: "tool-token-consumed", chatState, ctx, tokens, toolName: toolCall.toolName })
      return result
    } catch (e) {
      // Handle tool execution error by sending a tool result message with isError flag, so the agent can see the error and decide how to handle it (e.g. retry with a different input, or skip the tool call).
      await this.eventBus.emit({
        type: "tool-call-failed",
        chatState,
        ctx,
        toolCallId: toolCall.toolCallId,
        toolName: toolCall.toolName,
        error: e.toString(),
      })
      return {
        id: randomId(),
        role: "tool",
        content: [
          {
            type: "tool-result",
            toolCallId: toolCall.toolCallId,
            toolName: toolCall.toolName,
            output: {
              type: "error-text",
              value: `Error executing tool "${toolCall.toolName}": ${e instanceof Error ? e.message : String(e)}`,
            },
            isError: true,
          },
        ],
      }
    }
  }

  /**
   * Spawn effect needs to be here to call runAgent for sub-agents, since it's the only way to create a new agent interaction with a parent-child relationship.
   * This is not ideal but it avoids circular dependencies between Engine and ToolRegistry.
   */
  private async runSpawnAgent(
    toolCall: DomainMessageContentToolCall,
    parentCtx: AgentContext,
    chatState: ChatState
  ): Promise<DomainToolMessage> {
    const { toolCallId, toolName } = toolCall
    const parsed = spawnAgentInputSchema.safeParse(toolCall.input)
    if (!parsed.success) {
      return {
        id: randomId(),
        role: "tool",
        content: [
          {
            type: "tool-result",
            toolCallId,
            toolName,
            output: { type: "error-text", value: `Invalid spawn_agent input: ${parsed.error.message}` },
            isError: true,
          },
        ],
      }
    }

    const { agentName, task } = parsed.data
    const result = await this.runAgent(
      agentName,
      { id: randomId(), role: "user", content: [{ type: "text", text: task }] },
      chatState,
      parentCtx.agentId,
      parentCtx.depth + 1
    )

    return {
      id: randomId(),
      role: "tool",
      content: [
        {
          type: "tool-result",
          toolCallId,
          toolName,
          output: result.type === "text" ? { type: "text", value: result.text } : { type: "text", value: "done" },
        },
      ],
    }
  }

  // spawn_agent is a built-in tool managed by the Engine, not the ToolRegistry.
  // The schema is built dynamically so the LLM knows exactly which agents are available.
  private buildTools(depth: number = 0) {
    const spawnableAgents = this.agentRegistry.getSpawnableAgents()
    // Sub-agents can not invoke tools that require approval, since there's no user to approve the tool calls.
    const effectTools = this.toolRegistry.getAsAiTools({ withoutApprovalOnly: depth > 0 })
    if (spawnableAgents.length === 0) return effectTools
    const agentDescriptions = spawnableAgents.map((a) => `- ${a.name}: ${a.description}`).join("\n")
    const agentNameEnum = z.enum(spawnableAgents.map((a) => a.name) as [string, ...string[]])

    const spawnerDescription = `You can spawn a sub-agent to handle a specific task. The sub-agent shares the same chatState but has its own private conversation context.
Available agents:\n${agentDescriptions}

To spawn an agent, call the tool "spawn_agent" with input {"agentName": <agent name>, "task": <task description>}.`

    return {
      ...effectTools,
      spawn_agent: tool({
        description: spawnerDescription,
        inputSchema: z.object({
          agentName: agentNameEnum.describe("Name of the agent to spawn"),
          task: z.string().describe("Task description for the sub-agent"),
        }),
      }),
    }
  }

  private buildCtxFromHistory(chatState: ChatState, agentName: string): AgentContext {
    return { agentId: randomId(), agentName, depth: 0, messages: chatState.conversationHistory }
  }

  private openInteraction(chatState: ChatState, ctx: AgentContext): DomainAgentInteraction {
    const parentInteraction = ctx.parentAgentId ? chatState.interactions.findLast((i) => i.agentId === ctx.parentAgentId) : undefined
    const interaction: DomainAgentInteraction = {
      interactionId: randomId(),
      agentId: ctx.agentId,
      parentInteractionId: parentInteraction?.interactionId,
      agentName: ctx.agentName,
      depth: ctx.depth,
      startedAt: Date.now(),
    }
    chatState.interactions.push(interaction)
    return interaction
  }

  private closeInteraction(interaction: DomainAgentInteraction, result: AgentRunResult | null) {
    interaction.completedAt = Date.now()
    if (result?.type === "text") interaction.summary = result.text.slice(0, 200)
  }

  private pushMessageToContext(ctx: AgentContext, message: DomainMessage) {
    // If new assistant message comes in and any tool message that contains proceeded-file content,
    // the proceeded-file content will move to the assistant message.
    // This is a workaround to show the proceeded-file content in the UI.
    if (message.role === "assistant") {
      if (ctx.messages.length > 0) {
        const lastMessage = ctx.messages[ctx.messages.length - 1]
        if (lastMessage && lastMessage.role === "tool") {
          const proceededFileContents = lastMessage?.content.filter((c) => c.type === "proceeded-file")
          if (proceededFileContents.length > 0) {
            // Remove proceeded-file content from the tool message
            lastMessage.content = lastMessage.content.filter((c) => c.type !== "proceeded-file")
            // Add proceeded-file content to the assistant message
            const incomingMessage = { ...message, content: [...message.content, ...proceededFileContents] }
            ctx.messages.push(incomingMessage)
            return
          }
        }
      }
    }
    ctx.messages.push(message)
  }
}
