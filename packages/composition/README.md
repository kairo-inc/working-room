# @wr/composition

Dependency wiring across WorkingRoom's workspace packages.

## Purpose

This package is the composition root of the backend: it registers the concrete implementations for services and repositories defined in [`@wr/access`](../access/README.md), [`@wr/core`](../core/README.md), and [`@wr/db`](../db/README.md) into a single `tsyringe` dependency injection container. It also registers the default set of Agents and Tools.

## Structure

A single `src/index.ts` builds the container: data sources (`*Source`), the local `FileAccessService`/`BlobStore` pair, the `ChatEngine` and `EventBus`, the default Agents (`agentCoordinator`, `agentHeavy`), and the core Tools (e.g. `ToolReadTextFile`, `ToolWriteReplace`, `ToolListFolder`).

It exposes `getDiContainer()`, which returns the request-scoped container if one is set, or the default container otherwise.

## Usage

`apps/web` calls `getDiContainer()` to resolve services, and can extend the container with `AdditionalAgents` and `AdditionalTools` registrations without modifying this package.
