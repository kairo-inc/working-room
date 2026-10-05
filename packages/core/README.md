# @wr/core

Core engine for Agents, Tools, prompts, and events in WorkingRoom.

## Purpose

This package implements the chat/agent runtime: it runs a Chat's Agent loop, dispatches Tool calls, and emits events as a Chat progresses. It has no dependency on the web app or a specific storage provider — those are supplied through `@wr/access` and wired in by `@wr/composition`.

## Structure

- `agent/` — `AgentBuilder`, `AgentRegistry`, `agentCoordinator`, and the built-in `agentHeavy` Agent definition.
- `tool/` — core Tool implementations (e.g. `ToolReadTextFile`, `ToolWriteReplace`, `ToolListFolder`, `ToolFindFileByText`) and the `ToolRegistry` that resolves them for an Agent.
- `tool/mcp/` — `ToolMcp`, a Tool backed by an MCP server's Tool definition, and `buildMcpTools`, which builds them from a User's MCP servers. Unlike other Tools, one instance is created per MCP Tool at runtime.
- `engine.ts` — `ChatEngine`, which drives a Chat's Agent loop and Tool execution.
- `event/` — `EventBus`, used to publish Chat and Tool events.
- `prompt/` — prompt-building helpers (e.g. for file content).
- `map/` — mapping helpers between core types and Chat data.
- `config.ts` — `CoreConfig`, runtime configuration for the engine.

## Usage

`@wr/composition` registers this package's Agents, Tools, `ChatEngine`, and `EventBus` into the DI container. Additional Agents and Tools (e.g. self-hosted or vendor-specific ones) can be registered alongside the core set via `AdditionalAgents` and `AdditionalTools` without modifying this package. Tools of the User's MCP servers are registered per Chat via `McpTools`; `ToolRegistry` never lets them replace another Tool of the same name.
