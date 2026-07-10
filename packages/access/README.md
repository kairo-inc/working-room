# @wr/access

Blob storage and file-access service integrations for WorkingRoom.

## Purpose

This package provides the storage backends and services that let the rest of WorkingRoom read and write file content without depending on a specific storage provider.

## Structure

- `blob/` — `BlobStore` implementations for storing file content, with `local` (filesystem) and `s3` (AWS S3) backends.
- `service/access/` — the `FileAccessService`, which reads and writes file content by delegating to the configured `BlobStore`.
- `types/` — shared types for blob storage and file access.

## Usage

The `BlobStore` and `FileAccessService` implementations are registered in the dependency injection container in [`@wr/composition`](../composition/README.md). `apps/web` then resolves `FileAccessService` from that container (and imports its types directly) to read and write file content without depending on a specific storage provider.

It depends on `@wr/core`, `@wr/db`, `@wr/shared`, and `@wr/shared-node`.
