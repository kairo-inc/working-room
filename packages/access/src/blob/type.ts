// git-like blob store for file content, which is independent to file system providers.
// This allows us to support various file system providers without worrying about how to store the file content.
export abstract class BlobStore {
  /**
   * Creates a hash value for the given buffer. The hash value is used to identify the blob content.
   * The hash value should be unique for different content, and should be the same for the same content.
   *
   * @param buffer
   * The buffer for which to create a hash value.
   *
   * @returns hash value for the given buffer
   */
  abstract hash(buffer: ArrayBuffer): Promise<string>

  /**
   * Creates a file blob for the given buffer and returns the hash value. The hash value is used to identify the blob content.
   * The file will be created in the context folder, and the file name will be the hash value.
   * The file content will be the buffer content. The hash value should be unique for different content, and should be the same for the same content.
   *
   * @param buffer
   * The buffer for which to create a file blob.
   *
   * @returns hash value for the created blob
   */
  abstract createBlobHash(buffer: ArrayBuffer): Promise<string>

  /**
   * Gets the blob content for the given hash value. The hash value is used to identify the blob content.
   *
   * @param hashValue
   * The hash value for which to get the blob content.
   *
   * @returns
   * The blob content for the given hash value.
   */
  abstract getBlobHash(hashValue: string): Promise<ArrayBuffer>
  abstract getBlobHashStream(hashValue: string): Promise<NodeJS.ReadableStream>

  /**
   * Gets the blob path for the given hash value. The hash value is used to identify the blob content.
   *
   * @param hashValue
   * The hash value for which to get the blob path.
   *
   * @returns
   * The blob file's absolute path for the given hash value.
   */
  abstract getBlobPath(hashValue: string): Promise<string>

  abstract pathToHash(blobPath: string): Promise<string>

  abstract findByText(
    text: string,
    searchPath: string,
    options?: {
      maxResults?: number
    }
  ): Promise<string[]>
}
