# @wr/integration

Clients for external services used by Agent Tools in WorkingRoom.

## Purpose

This package talks to external services on a User's behalf, such as Slack and MCP servers. Each service is exposed as an abstract client class (e.g. `SlackClient`, `McpClient`) so that Tools in [`@wr/core`](../core/README.md) depend only on the abstraction, and SDK-specific types and errors stay inside this package.

## Structure

- `oauth/` — OAuth2 client support: `OauthService` (handling the OAuth callback and refreshing tokens), PKCE and state helpers, provider definitions (`providers/`), and `ContextStore`, which holds a connection's access token so a refreshed token is shared across the request.
- `slack/` — `SlackClient` and its implementation over `@slack/web-api`.
- `mcp/` — `McpClient` and its implementation over `@modelcontextprotocol/sdk`, using the Streamable HTTP transport with an optional Bearer token. SDK errors are converted into `McpServerAuthError`, `McpServerConnectionError`, and `McpToolNotFoundError` from [`@wr/shared`](../shared/README.md).
- `types/` — `IntegrationContext`, the per-request context holding the current User's connections.

## Usage

`@wr/composition` registers the client implementations (`SlackClient`, `McpClient`, `OauthService`) into the DI container. `apps/web` registers an `IntegrationContext` with the current User's connections for each Chat.

Unlike OAuth connections, MCP servers are not part of `IntegrationContext`: their connection info is passed to `McpClient` with each call, since a User can have any number of them.
