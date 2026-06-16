/**
 * This service is responsible for managing files and folders.
 */
import { FileDescriptorSortBy } from "@wr/db"
import { DomainFileDescriptor, MimeType, PageArg, PageResult } from "@wr/shared"

export type FileAccessContext = {
  userId: string
  showHiddenFiles?: boolean
}

export type FileAccessServiceListArg = PageArg<FileDescriptorSortBy> & {
  descId: string
  maxDepth?: number
  maxItems?: number
}

export type FileAccessServiceReadFileArg = {
  id: string
  maxBytes?: number
}

export type FileAccessServiceReadBlobArg = {
  blobHash: string
  maxBytes?: number
}

export type FileAccessServiceDeleteManyArg = {
  ids: string[]
  onlyFiles?: boolean
  onlyDirectories?: boolean
}

export type FileAccessServiceWriteFileNewArg = {
  parentDescId: string
  fileName: string
  mimeType: MimeType
  content: ArrayBuffer
}

export type FileAccessServiceWriteBlobNewArg = {
  content: ArrayBuffer
}

export type FileAccessServiceWriteFileAppendArg = {
  id: string
  content: string
}

export type FileAccessServiceWriteBlobAppendArg = {
  blobHash: string
  content: string
}

export type FileAccessServiceWriteFileReplaceArg = {
  id: string
  oldContent: string
  newContent: string
}

export type FileAccessServiceWriteBlobReplaceArg = {
  blobHash: string
  oldContent: string
  newContent: string
}

export type FileAccessServiceMoveFileArg = {
  descId: string
  parentDescId: string
  newName?: string
}

export type FileAccessServiceCreateChatFileArg = {
  chatId: string
  fileName: string
  content: ArrayBuffer
  mimeType: MimeType
}

export type FileAccessServiceDifferenceBlobArg = {
  sourceBlobHash: string
  targetBlobHash: string
  filename?: string
}

export type FileAccessServiceWriteBlobRet = {
  blobHash: string
}

export type FileAccessServiceUploadArg = {
  file: File
  parentDescId: string
}

export type FileAccessServiceMakeDirectoryArg = {
  parentDescId: string
  dirName: string
}

export type FileAccessServiceRenameArg = {
  descId: string
  newName: string
}

export type FileAccessServiceFindByTextOptions = {
  maxResults?: number
}

export type FileAccessServiceFindByNameOptions = {
  maxResults?: number
}

export type FileAccessServiceFindByTextResult = {
  files: DomainFileDescriptor[]
  totalCount: number
}

export type FileAccessServiceFindByNameResult = {
  files: DomainFileDescriptor[]
  totalCount: number
}

export type FileAccessServiceCopyFileArg = {
  descId: string
  newName?: string
}

export abstract class FileAccessService {
  // Check permission
  abstract checkAccessPolicyAndThrow(descId: string, requiredPermission: "read" | "write"): Promise<void>

  abstract rootDescriptor(): Promise<DomainFileDescriptor>
  abstract getDescriptor(descId: string): Promise<DomainFileDescriptor>
  abstract buildReadablePath(descId: string): Promise<string>

  abstract upload(arg: FileAccessServiceUploadArg): Promise<DomainFileDescriptor>
  abstract createRootDir(): Promise<DomainFileDescriptor>
  abstract createSharedRootDir(): Promise<DomainFileDescriptor>
  abstract createPrivateDir(): Promise<DomainFileDescriptor>
  abstract createChatFile(arg: FileAccessServiceCreateChatFileArg): Promise<DomainFileDescriptor>

  abstract list(arg: FileAccessServiceListArg): Promise<PageResult<DomainFileDescriptor>>

  abstract readFile(arg: FileAccessServiceReadFileArg): Promise<ArrayBuffer>
  abstract readBlob(arg: FileAccessServiceReadBlobArg): Promise<ArrayBuffer>
  abstract readBlobStream(arg: FileAccessServiceReadBlobArg): Promise<NodeJS.ReadableStream>

  abstract makeDirectory(arg: FileAccessServiceMakeDirectoryArg): Promise<DomainFileDescriptor>

  abstract writeFileNew(arg: FileAccessServiceWriteFileNewArg): Promise<DomainFileDescriptor>
  abstract writeBlobNew(arg: FileAccessServiceWriteBlobNewArg): Promise<string>

  abstract writeFileAppend(arg: FileAccessServiceWriteFileAppendArg): Promise<DomainFileDescriptor>
  abstract writeBlobAppend(arg: FileAccessServiceWriteBlobAppendArg): Promise<FileAccessServiceWriteBlobRet>

  abstract writeFileReplace(arg: FileAccessServiceWriteFileReplaceArg): Promise<DomainFileDescriptor>
  abstract writeBlobReplace(arg: FileAccessServiceWriteBlobReplaceArg): Promise<FileAccessServiceWriteBlobRet>

  abstract differenceBlob(arg: FileAccessServiceDifferenceBlobArg): Promise<string>

  abstract deleteMany(arg: FileAccessServiceDeleteManyArg): Promise<void>

  abstract moveFile(arg: FileAccessServiceMoveFileArg): Promise<DomainFileDescriptor>

  abstract copyFile(arg: FileAccessServiceCopyFileArg): Promise<DomainFileDescriptor>

  abstract rename(arg: FileAccessServiceRenameArg): Promise<DomainFileDescriptor>

  abstract findByText(text: string, options?: FileAccessServiceFindByTextOptions): Promise<FileAccessServiceFindByTextResult>
  abstract findByName(name: string, options?: FileAccessServiceFindByNameOptions): Promise<FileAccessServiceFindByNameResult>

  abstract restoreHistory(historyId: string): Promise<void>
}
