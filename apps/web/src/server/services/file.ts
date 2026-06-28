import { inject, injectable } from "tsyringe"

import { FileAccessService } from "@wr/access"
import { FileHistorySource } from "@wr/db"
import {
  DomainFileDescriptor,
  DomainMessageContentFileRef,
  DomainMessageContentToolResult,
  ImageMimeType,
  InvalidChatDirAccessError,
  InvalidPrivateDirAccessError,
  MimeType,
  PageResult,
} from "@wr/shared"

import { mapFileDescriptorDomainToApp } from "../../map/file"
import { mapFileHistoryEntityToApp } from "../../map/fileHistory"
import { AppFileDescriptor } from "../../types/file"
import { AppFileHistory } from "../../types/fileHistory"
import {
  FileService,
  FileServiceCheckAccessPolicyArg,
  FileServiceCheckAncestorOrThrowArg,
  FileServiceContentToFileArg,
  FileServiceContentToFileResult,
  FileServiceContentToReferenceArg,
  FileServiceContentToReferenceResult,
  FileServiceCopyFileArg,
  FileServiceCreateDirectoryArg,
  FileServiceDeleteManyArg,
  FileServiceGetAncestorsArg,
  FileServiceGetArg,
  FileServiceGetBinaryFileContentArg,
  FileServiceGetFilesInFolderArg,
  FileServiceGetHistoryListArg,
  FileServiceGetParentOrRootArg,
  FileServiceMoveFileArg,
  FileServiceRenameArg,
  FileServiceUploadFileArg,
  FileServiceUploadFileToChatArg,
} from "./fileType"

@injectable()
export class FileServiceImpl extends FileService {
  constructor(
    @inject("FileAccessService") private fileAccessService: FileAccessService,
    @inject("FileHistorySource") private fileHistorySource: FileHistorySource
  ) {
    super()
  }

  async checkAccessPolicyAndThrow(arg: FileServiceCheckAccessPolicyArg): Promise<void> {
    const { descId, requiredPermission } = arg
    await this.fileAccessService.checkAccessPolicyAndThrow(descId, requiredPermission)
  }

  async checkIsUnderSpecialDirAndThrow(arg: FileServiceCheckAncestorOrThrowArg): Promise<void> {
    const { id, isUnderChatDir, isUnderPrivateDir } = arg
    const ancestors = await this.getAncestors({ id })
    for (const ancestor of ancestors.reverse()) {
      if (ancestor.isChatDir && isUnderChatDir) {
        throw new InvalidChatDirAccessError("Chat directories cannot be accessed")
      } else if (ancestor.isPrivateRoot && isUnderPrivateDir) {
        throw new InvalidPrivateDirAccessError("Private directories cannot be accessed")
      }
    }
  }

  async get(arg: FileServiceGetArg): Promise<AppFileDescriptor> {
    const { id } = arg
    const file = await this.fileAccessService.getDescriptor(id)
    return mapFileDescriptorDomainToApp(file)
  }

  async getBinaryFileContent(arg: FileServiceGetBinaryFileContentArg): Promise<ArrayBuffer> {
    const { id, historyId } = arg
    let blobHash: string | null = null
    if (historyId) {
      const history = await this.fileHistorySource.find("EntityFileHistory", {
        where: { id: historyId, fileDescriptor: { id } },
      })
      blobHash = history.blobHash
    }
    if (!blobHash) {
      const fileDescriptor = await this.fileAccessService.getDescriptor(id)
      blobHash = fileDescriptor.blobHash
    }
    const content = await this.fileAccessService.readBlob({ blobHash })
    return content
  }

  async getBinaryFileContentStream(arg: FileServiceGetBinaryFileContentArg): Promise<NodeJS.ReadableStream> {
    const { id, historyId } = arg
    let blobHash: string | null = null
    if (historyId) {
      const history = await this.fileHistorySource.find("EntityFileHistory", {
        where: { id: historyId, fileDescriptor: { id } },
      })
      blobHash = history.blobHash
    }
    if (!blobHash) {
      const fileDescriptor = await this.fileAccessService.getDescriptor(id)
      blobHash = fileDescriptor.blobHash
    }

    const stream = await this.fileAccessService.readBlobStream({ blobHash })
    return stream
  }

  async getAncestors(arg: FileServiceGetAncestorsArg): Promise<AppFileDescriptor[]> {
    const { id } = arg
    const desc = await this.fileAccessService.getDescriptor(id)
    if (!desc) {
      return []
    }
    const getParent = async (desc: DomainFileDescriptor): Promise<AppFileDescriptor[]> => {
      if (desc.parentId) {
        const parent = await this.fileAccessService.getDescriptor(desc.parentId)
        if (parent) {
          const app = mapFileDescriptorDomainToApp(parent)
          return [...(await getParent(parent)), app]
        }
      }
      return []
    }
    // NOTE: Include itself.
    return [...(await getParent(desc)), mapFileDescriptorDomainToApp(desc)]
  }

  async getParentOrRoot(arg: FileServiceGetParentOrRootArg): Promise<AppFileDescriptor> {
    const { id } = arg
    if (!id) {
      return mapFileDescriptorDomainToApp(await this.ensureRootDir())
    } else {
      const p = await this.fileAccessService.getDescriptor(id)
      return mapFileDescriptorDomainToApp(p)
    }
  }

  async getFilesInFolder(arg: FileServiceGetFilesInFolderArg): Promise<PageResult<AppFileDescriptor>> {
    const { id, ...pages } = arg
    const { data, ...rest } = await this.fileAccessService.list({ descId: id, ...pages, take: 30 })
    return { data: data.map(mapFileDescriptorDomainToApp), ...rest }
  }

  async deleteMany(arg: FileServiceDeleteManyArg): Promise<void> {
    const { ids } = arg
    await this.fileAccessService.deleteMany({ ids })
  }

  async uploadFile(arg: FileServiceUploadFileArg): Promise<void> {
    const { parentId, files } = arg
    for (const file of files) {
      await this.fileAccessService.upload({ file, parentDescId: parentId })
    }
  }

  async uploadFileToChat(arg: FileServiceUploadFileToChatArg): Promise<AppFileDescriptor> {
    const { file, chatId } = arg
    const desc = await this.fileAccessService.createChatFile({
      chatId,
      fileName: file.name,
      content: await file.arrayBuffer(),
      mimeType: file.type as MimeType,
    })
    return mapFileDescriptorDomainToApp(desc)
  }

  async moveFile(arg: FileServiceMoveFileArg): Promise<AppFileDescriptor> {
    const { descId, targetFolderId } = arg
    const desc = await this.fileAccessService.moveFile({
      descId,
      parentDescId: targetFolderId,
    })
    return mapFileDescriptorDomainToApp(desc)
  }

  async copyFile(arg: FileServiceCopyFileArg): Promise<AppFileDescriptor> {
    const { descId, newName } = arg
    const desc = await this.fileAccessService.copyFile({
      descId,
      newName,
    })
    return mapFileDescriptorDomainToApp(desc)
  }

  async createDirectory(arg: FileServiceCreateDirectoryArg): Promise<AppFileDescriptor> {
    const { parentId, name } = arg
    const desc = await this.fileAccessService.makeDirectory({
      parentDescId: parentId,
      dirName: name,
    })
    return mapFileDescriptorDomainToApp(desc)
  }

  async rename(arg: FileServiceRenameArg): Promise<AppFileDescriptor> {
    const { descId, newName } = arg
    const desc = await this.fileAccessService.rename({
      descId,
      newName,
    })
    return mapFileDescriptorDomainToApp(desc)
  }

  async getHistoryList(arg: FileServiceGetHistoryListArg): Promise<PageResult<AppFileHistory>> {
    const { descId, ...page } = arg
    await this.get({ id: descId })
    const { data, ...rest } = await this.fileHistorySource.findMany("EntityFileHistory", {
      where: { fileDescriptor: { id: descId } },
      ...page,
    })
    return {
      data: data.map(mapFileHistoryEntityToApp),
      ...rest,
    }
  }

  // Ref -> Data
  async referenceToDataContent(arg: FileServiceContentToFileArg): Promise<FileServiceContentToFileResult> {
    const content = arg
    if (content.type === "file-ref") {
      const { descId, blobHash, mimeType } = content
      const blob = await this.fileAccessService.readBlob({ blobHash })
      if (mimeType.startsWith("image/")) {
        return {
          type: "image",
          image: Buffer.from(blob).toString("base64"),
          descId,
          mediaType: mimeType as ImageMimeType,
        }
      } else if (mimeType === "application/pdf") {
        return {
          type: "file",
          data: Buffer.from(blob).toString("base64"),
          descId,
          mediaType: mimeType as MimeType,
        }
      } else if (mimeType.startsWith("text/")) {
        return {
          type: "text-file",
          data: `This is a text file with MIME type ${mimeType}.\nContent: \n${Buffer.from(blob).toString("utf-8")}`,
          descId,
          mediaType: mimeType as MimeType,
        }
      }
    } else if (content.type === "tool-result") {
      if (content.output.type === "file-ref") {
        const { descId, blobHash, mimeType } = content.output
        const blob = await this.fileAccessService.readBlob({ blobHash })
        if (mimeType.startsWith("image/")) {
          return {
            type: "tool-result",
            toolCallId: content.toolCallId,
            toolName: content.toolName,
            output: {
              type: "image",
              image: Buffer.from(blob).toString("base64"),
              descId,
              mediaType: mimeType as ImageMimeType,
            },
          } satisfies DomainMessageContentToolResult
        } else if (mimeType === "application/pdf") {
          return {
            type: "tool-result",
            toolCallId: content.toolCallId,
            toolName: content.toolName,
            output: {
              type: "file",
              data: Buffer.from(blob).toString("base64"),
              descId,
              mediaType: mimeType as MimeType,
            },
          } satisfies DomainMessageContentToolResult
        }
      }
    }
    return content
  }

  async dataToReferenceContent(arg: FileServiceContentToReferenceArg): Promise<FileServiceContentToReferenceResult> {
    const content = arg
    if (content.type === "image") {
      const { descId, image: base64Data } = content
      const blobHash = await this.fileAccessService.writeBlobNew({
        content: Buffer.from(base64Data, "base64").buffer,
      })
      return {
        type: "file-ref",
        blobHash,
        descId,
        mimeType: content.mediaType as MimeType,
      } satisfies DomainMessageContentFileRef
    } else if (content.type === "file") {
      const { descId, data: base64Data } = content
      const blobHash = await this.fileAccessService.writeBlobNew({
        content: Buffer.from(base64Data, "base64").buffer,
      })
      return {
        type: "file-ref",
        blobHash,
        descId,
        mimeType: content.mediaType as MimeType,
      } satisfies DomainMessageContentFileRef
    } else if (content.type === "text-file") {
      const { descId, data: textData } = content
      const blobHash = await this.fileAccessService.writeBlobNew({
        content: Buffer.from(textData, "utf-8").buffer,
      })
      return {
        type: "file-ref",
        blobHash,
        descId,
        mimeType: content.mediaType as MimeType,
      } satisfies DomainMessageContentFileRef
    } else if (content.type === "tool-result") {
      if (content.output.type === "image") {
        const { descId, image: base64Data } = content.output
        const blobHash = await this.fileAccessService.writeBlobNew({
          content: new Uint8Array(Buffer.from(base64Data, "base64")).buffer,
        })
        return {
          type: "tool-result",
          toolCallId: content.toolCallId,
          toolName: content.toolName,
          output: {
            type: "file-ref",
            blobHash,
            descId,
            mimeType: content.output.mediaType as MimeType,
          },
        } satisfies DomainMessageContentToolResult
      } else if (content.output.type === "file") {
        const { descId, data: base64Data } = content.output
        const blobHash = await this.fileAccessService.writeBlobNew({
          content: new Uint8Array(Buffer.from(base64Data, "base64")).buffer,
        })
        return {
          type: "tool-result",
          toolCallId: content.toolCallId,
          toolName: content.toolName,
          output: {
            type: "file-ref",
            blobHash,
            descId,
            mimeType: content.output.mediaType as MimeType,
          },
        } satisfies DomainMessageContentToolResult
      }
    }
    return content
  }

  async restoreHistory(historyId: string): Promise<void> {
    await this.fileAccessService.restoreHistory(historyId)
  }

  async ensureRootDir(): Promise<DomainFileDescriptor> {
    return await this.fileAccessService.createRootDir()
  }
  async ensurePrivateDir(): Promise<DomainFileDescriptor> {
    return await this.fileAccessService.createPrivateDir()
  }
}
