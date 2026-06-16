import { rgPath } from "@vscode/ripgrep"
import { spawnSync } from "child_process"
import fs from "fs"
import fsPromise from "fs/promises"
import pathLib from "path"
import { inject, injectable } from "tsyringe"

import { CoreConfig } from "@wr/core"
import { BadRequestError, ConfigError, ImplementationError, NotFoundError, UnknownError } from "@wr/shared"
import { makeHash } from "@wr/shared-node"

import { BlobStore } from "../type"

@injectable()
export class LocalBlobStore extends BlobStore {
  constructor(@inject("CoreConfig") private coreConfig: CoreConfig) {
    super()
  }

  async hash(buffer: ArrayBuffer): Promise<string> {
    return makeHash(buffer)
  }

  async createBlobHash(buffer: ArrayBuffer): Promise<string> {
    const hashValue = await this.hash(buffer)
    const filepath = await this.getBlobPath(hashValue)
    const dirPath = pathLib.dirname(filepath)

    await fsPromise.mkdir(dirPath, { recursive: true })

    const exists = await fsPromise
      .stat(filepath)
      .then(() => true)
      .catch(() => false)

    if (exists) {
      return hashValue
    }

    await fsPromise.writeFile(filepath, Buffer.from(buffer))
    return hashValue
  }

  async getBlobHash(hashValue: string): Promise<ArrayBuffer> {
    const filePath = await this.getBlobPath(hashValue)
    try {
      const fileBuffer = await fsPromise.readFile(filePath)
      return new Uint8Array(fileBuffer).buffer
    } catch (e) {
      throw new NotFoundError(`Blob not found for hash: ${hashValue}`)
    }
  }

  async getBlobHashStream(hashValue: string): Promise<NodeJS.ReadableStream> {
    const filePath = await this.getBlobPath(hashValue)
    try {
      const stream = fs.createReadStream(filePath)
      return stream
    } catch (e) {
      throw new NotFoundError(`Blob not found for hash: ${hashValue}`)
    }
  }

  async getBlobPath(hashValue: string): Promise<string> {
    // Check the format of the input hash value.
    const [prefix, restHash] = hashValue.split(/(.{2})(.*)/).slice(1)
    if (!prefix || !restHash) {
      throw new ImplementationError(`Invalid hash value: ${hashValue}`)
    }

    const { root, blobDir } = this.coreConfig
    // Check existance.
    await fsPromise.mkdir(root, { recursive: true })
    await fsPromise.mkdir(blobDir, { recursive: true })

    const absoluteBlobDir = pathLib.resolve(blobDir)
    const absoluteRoot = pathLib.resolve(root)
    if (!absoluteBlobDir.startsWith(absoluteRoot)) {
      throw new ConfigError(`Invalid blobDir: ${blobDir} is not inside root: ${root}`)
    }

    return pathLib.join(blobDir, prefix, restHash)
  }

  async pathToHash(blobPath: string): Promise<string> {
    const { blobDir } = this.coreConfig
    const path = blobPath.replace(blobDir, "")
    const [prefix, restHash] = path.split(pathLib.sep).slice(1)
    if (!prefix || !restHash) {
      throw new BadRequestError(`Invalid blob path: ${blobPath}`)
    }
    return prefix + restHash
  }

  async findByText(text: string, searchPath: string, options?: { maxResults?: number }): Promise<string[]> {
    const { maxResults } = options || {}
    const result = spawnSync(rgPath, [text, "--files-with-matches", "--no-ignore", "--follow", "--hidden", searchPath], {})
    if (result.status === 1) {
      throw new NotFoundError(`No blob found containing text: ${text}`)
    } else if (result.status !== 0) {
      throw new UnknownError(`Error searching blobs: ${result.stderr.toString()}`)
    }
    const filePaths = result.stdout.toString().split("\n").filter(Boolean).slice(0, maxResults)
    const hashList = await Promise.all(
      filePaths.map(async (filePath) => {
        const hash = await this.pathToHash(filePath)
        return hash
      })
    )
    return hashList
  }
}
