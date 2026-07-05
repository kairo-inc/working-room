import { FileDescriptorSortBy, FileHistorySortBy } from "@wr/db"
import { DomainFileDescriptor, DomainMessageContent, PageArg, PageResult } from "@wr/shared"

import { AppFileDescriptor } from "../../types/file"
import { AppFileHistory } from "../../types/fileHistory"

export type FileServiceCheckAncestorOrThrowArg = {
  id: string
  isUnderChatDir?: boolean
  isUnderPrivateDir?: boolean
}

export type FileServiceGetBinaryFileContentArg = {
  id: string
  historyId?: string
}

export type FileServiceGetAncestorsArg = {
  id: string
}

export type FileServiceGetArg = {
  id: string
}

export type FileServiceGetParentOrRootArg = {
  id?: string
}

export type FileServiceGetFilesInFolderArg = PageArg<FileDescriptorSortBy> & {
  id: string
}

export type FileServiceUploadFileArg = {
  parentId: string
  files: File[]
}

export type FileServiceUploadFileToChatArg = {
  file: File
  chatId: string
}

export type FileServiceContentToFileArg = DomainMessageContent
export type FileServiceContentToFileResult = DomainMessageContent | null

export type FileServiceContentToReferenceArg = DomainMessageContent
export type FileServiceContentToReferenceResult = DomainMessageContent | null

export type FileServiceDeleteManyArg = {
  ids: string[]
}

export type FileServiceCreateDirectoryArg = {
  parentId: string
  name: string
}

export type FileServiceCopyFileArg = {
  descId: string
  newName?: string
}

export type FileServiceMoveFileArg = {
  descId: string
  targetFolderId: string
}

export type FileServiceRenameArg = {
  descId: string
  newName: string
}

export type FileServiceGetHistoryListArg = PageArg<FileHistorySortBy> & {
  descId: string
}

export type FileServiceCheckAccessPolicyArg = {
  descId: string
  requiredPermission: "read" | "write"
}

export type FileServiceCreateEmptyFileArg = {
  parentId: string
  name: string
  mimeType: "text/markdown" | "text/plain"
}

export type FileServiceUpdateTextContentArg = {
  id: string
  oldContent: string
  newContent: string
}

export abstract class FileService {
  abstract checkAccessPolicyAndThrow(arg: FileServiceCheckAccessPolicyArg): Promise<void>
  abstract checkIsUnderSpecialDirAndThrow(arg: FileServiceCheckAncestorOrThrowArg): Promise<void>

  abstract get(arg: FileServiceGetArg): Promise<AppFileDescriptor>
  abstract getBinaryFileContent(arg: FileServiceGetBinaryFileContentArg): Promise<ArrayBuffer>
  abstract getBinaryFileContentStream(arg: FileServiceGetBinaryFileContentArg): Promise<NodeJS.ReadableStream>
  abstract getAncestors(arg: FileServiceGetAncestorsArg): Promise<AppFileDescriptor[]>
  abstract getParentOrRoot(arg: FileServiceGetParentOrRootArg): Promise<AppFileDescriptor>
  abstract getFilesInFolder(arg: FileServiceGetFilesInFolderArg): Promise<PageResult<AppFileDescriptor>>

  abstract deleteMany(arg: FileServiceDeleteManyArg): Promise<void>

  abstract uploadFile(arg: FileServiceUploadFileArg): Promise<void>
  abstract uploadFileToChat(arg: FileServiceUploadFileToChatArg): Promise<AppFileDescriptor>

  abstract createDirectory(arg: FileServiceCreateDirectoryArg): Promise<AppFileDescriptor>
  abstract createEmptyFile(arg: FileServiceCreateEmptyFileArg): Promise<AppFileDescriptor>

  abstract moveFile(arg: FileServiceMoveFileArg): Promise<AppFileDescriptor>
  abstract copyFile(arg: FileServiceCopyFileArg): Promise<AppFileDescriptor>

  // Encode/Decode files in a message.
  abstract referenceToDataContent(arg: FileServiceContentToFileArg): Promise<FileServiceContentToFileResult>
  abstract dataToReferenceContent(arg: FileServiceContentToReferenceArg): Promise<FileServiceContentToReferenceResult>

  abstract rename(arg: FileServiceRenameArg): Promise<AppFileDescriptor>

  abstract updateTextContent(arg: FileServiceUpdateTextContentArg): Promise<AppFileDescriptor>

  abstract restoreHistory(historyId: string): Promise<void>
  abstract getHistoryList(arg: FileServiceGetHistoryListArg): Promise<PageResult<AppFileHistory>>

  // Server side utility
  abstract ensureRootDir(): Promise<DomainFileDescriptor>
  abstract ensurePrivateDir(): Promise<DomainFileDescriptor>
}
