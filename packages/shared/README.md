# @wr/shared

Shared TypeScript types and cross-runtime utilities for WorkingRoom.

## Purpose

This package holds the Domain types and utilities that are safe to use in both browser and Node.js code (e.g. the Next.js app's client and server code, and the core engine). Anything that requires a Node.js-only API belongs in [`@wr/shared-node`](../shared-node/README.md) instead.

## Structure

- `types/domains/` — Domain types shared across the app: `Chat`, `Message`, `Tenant`, `User`, `Policy`, `File`, `ConsumedToken`. These are the "Domain" layer described in [`@wr/db`'s mapper docs](../db/src/map/README.md), independent of both the database and any AI SDK.
- `types/ais/` — types related to AI vendors and models.
- `types/error/` — shared error classes (e.g. `BadRequestError`, `AuthenticationError`).
- `utils/` — cross-runtime utility functions, including AI vendor helpers.

## Usage

Nearly every other package and `apps/web` depend on `@wr/shared` for Domain and error types. It has no dependency on any other `@wr/*` package.
