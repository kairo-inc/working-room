# @wr/db

Prisma schema, migrations, and database access for WorkingRoom.

## Purpose

This package owns the database schema and is the only package that talks to the database directly. Everything else accesses data through the `*Source` classes it exports, keeping SQLite/PostgreSQL and Prisma details out of the rest of the codebase.

## Structure

- `prisma/schema.prisma` — the Prisma schema and migrations, supporting both SQLite (default, local development) and PostgreSQL.
- `entities/` — Entity types, the database-shaped representation of each Prisma model (see [`src/map/README.md`](./src/map/README.md) for how these relate to Domain types).
- `sources/` — one `*Source` class per Entity (e.g. `ChatSource`, `FileHistorySource`), implementing find/create/update operations used by the rest of the app.
- `map/` — mapper functions between Entity, Domain, and Ai types.
- `db.ts` — `createPrismaClient()`, the Prisma client factory.
- `enums.ts` — shared enum types re-exported from the Prisma schema.
- `seed/` — seed scripts, including `forDocs.ts` used by `yarn seed:docs`.

## Usage

`@wr/composition` registers each `*Source` implementation into the DI container; services in `apps/web` and [`@wr/access`](../access/README.md) depend on the `*Source` interfaces rather than this package's Prisma client directly. Domain types used by callers are defined in [`@wr/shared`](../shared/README.md), not here.

Schema changes go through `yarn prisma:dev` (migrate) and `yarn prisma:generate` (regenerate the client), defined at the repository root.
