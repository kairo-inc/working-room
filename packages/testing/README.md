# @wr/testing

Shared testing fixtures and helpers for WorkingRoom.

## Purpose

This package provides factory functions for setting up test data (Tenants, Users, Access Groups, and their signed-in state) so that tests across the monorepo don't each reimplement their own setup and teardown.

## Structure

- `fixtures/factory.ts` — factory functions that reset the test database and create Tenants/Users with a signed ID token, ready to use in integration tests.

## Usage

Used as a `devDependency`/`peerDependency` from test suites in other packages (e.g. `@wr/db`'s `*.spec.ts` files) and in `apps/web`. Depends on `@wr/db` and `@wr/shared`.
