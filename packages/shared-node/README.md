# @wr/shared-node

Node.js-specific shared utilities for WorkingRoom.

## Purpose

This package holds utilities that depend on Node.js-only APIs, separated from [`@wr/shared`](../shared/README.md) so that browser-safe code never accidentally pulls in a Node.js dependency.

## Structure

- `jwt.ts` — `decodeJwt`/`encodeJwt`, for decoding and verifying ID tokens.
- `hash.ts` — `makeHash` (content hashing, e.g. for blob hashes) and `makePasswordHash` (bcrypt password hashing).
- `context.ts` — `AsyncLocalStorage`-based request context, including the DI container context used by `@wr/composition`'s `getDiContainer()`.
- `queue.ts` — `createAsyncQueue`, an async iterator-based queue used for streaming events.
- `random.ts` — `randomId`, for generating CUID-based IDs.

## Usage

Used by `apps/web` and other `@wr/*` packages wherever a Node.js runtime is guaranteed (e.g. authentication, ID generation, request-scoped DI). Depends on `@wr/shared` for shared error types.
