import { S3Client } from "@aws-sdk/client-s3/dist-types/S3Client"
import { inject, injectable } from "tsyringe"

import { makeHash } from "@wr/shared-node"

import { BlobStore } from "../type"

/**
 * S3 compatible BlobStore implementation.
 * Currently, this class is a stub and does not implement the actual S3 interactions.
 * TODO: Implement the methods to interact with S3 for storing and retrieving blobs.
 */
@injectable()
export class S3BlobStore extends BlobStore {
  constructor(@inject("S3Client") private s3Client: S3Client) {
    super()
  }

  async hash(buffer: ArrayBuffer): Promise<string> {
    return makeHash(buffer)
  }
  async createBlobHash(buffer: ArrayBuffer): Promise<string> {
    throw new Error("Method not implemented.")
  }
  async getBlobHash(hashValue: string): Promise<ArrayBuffer> {
    throw new Error("Method not implemented.")
  }
  async getBlobHashStream(hashValue: string): Promise<NodeJS.ReadableStream> {
    throw new Error("Method not implemented.")
  }
  async getBlobPath(hashValue: string): Promise<string> {
    throw new Error("Method not implemented.")
  }
  async pathToHash(blobPath: string): Promise<string> {
    throw new Error("Method not implemented.")
  }
  async findByText(text: string, searchPath: string, options?: { maxResults?: number }): Promise<string[]> {
    throw new Error("Method not implemented.")
  }
}
