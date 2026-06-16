import pathLib from "path"
import "reflect-metadata"
import { beforeEach, describe, expect, it } from "vitest"

import { getDiContainer } from "@wr/composition"
import { CoreConfig } from "@wr/core"
import { ConfigError, ImplementationError, NotFoundError } from "@wr/shared"
import { runWithDiContainer } from "@wr/shared-node"
import { createTestConfigWithTmpFolder } from "@wr/testing"

import { BlobStore } from "../type"

describe("[Success] LocalBlobStore", () => {
  let testContainer: ReturnType<typeof getDiContainer>
  let config: CoreConfig

  beforeEach(() => {
    testContainer = getDiContainer().createChildContainer()
    config = createTestConfigWithTmpFolder()
    testContainer.registerInstance<CoreConfig>("CoreConfig", config)
  })

  it("Should generate hash and store blob correctly", async () => {
    await runWithDiContainer(testContainer, async () => {
      const localBlobStore = testContainer.resolve<BlobStore>("BlobStore")
      const blob = new TextEncoder().encode("Hello, World!").buffer
      const hash = await localBlobStore.createBlobHash(blob)
      const path = await localBlobStore.getBlobPath(hash)

      // Check.
      // 1. The path is the child of blobDir
      expect(path.startsWith(config.blobDir)).toBe(true)

      // 2. The path is in the format of blobDir/prefix/restHash
      const relativePath = pathLib.relative(config.blobDir, path)
      const [prefix, restHash] = relativePath.split(pathLib.sep)
      expect(prefix).toHaveLength(2)
      expect(restHash).toHaveLength(64 - 2) // SHA-256 hash length is 64 characters

      // 3. The content of the file is correct
      const storedBlob = await localBlobStore.getBlobHash(hash)
      expect(new TextDecoder().decode(storedBlob)).toBe("Hello, World!")
    })
  })
})

describe("[Failure] LocalBlobStore - with invalid configuration", () => {
  let testContainer: ReturnType<typeof getDiContainer>
  let config: CoreConfig

  beforeEach(() => {
    testContainer = getDiContainer().createChildContainer()
    config = createTestConfigWithTmpFolder({ root: "./test-root", blobDir: "./blobs" }) // Invalid blobDir
    testContainer.registerInstance<CoreConfig>("CoreConfig", config)
  })

  it("Should throw an error when blob dir is not a child of root", async () => {
    await runWithDiContainer(testContainer, async () => {
      const localBlobStore = testContainer.resolve<BlobStore>("BlobStore")
      const blob = new TextEncoder().encode("Hello, World!").buffer

      // This will throw an error because the blobDir is not a child of root
      const hashPromise = localBlobStore.createBlobHash(blob)
      await expect(hashPromise).rejects.toThrow(ConfigError)
    })
  })
})

describe("[Failure] LocalBlobStore - with invalid hash or missing blob", () => {
  let testContainer: ReturnType<typeof getDiContainer>
  let config: CoreConfig

  beforeEach(() => {
    testContainer = getDiContainer().createChildContainer()
    config = createTestConfigWithTmpFolder()
    testContainer.registerInstance<CoreConfig>("CoreConfig", config)
  })

  it("Should throw an error when hash value is invalid", async () => {
    await runWithDiContainer(testContainer, async () => {
      const localBlobStore = testContainer.resolve<BlobStore>("BlobStore")
      const hashPromise = localBlobStore.getBlobPath("a")
      await expect(hashPromise).rejects.toThrow(ImplementationError)
    })
  })

  it("Should throw an error when blobHash file not found", async () => {
    await runWithDiContainer(testContainer, async () => {
      const localBlobStore = testContainer.resolve<BlobStore>("BlobStore")
      const hashPromise = localBlobStore.getBlobHash("a".repeat(64))
      await expect(hashPromise).rejects.toThrow(NotFoundError)
    })
  })
})
