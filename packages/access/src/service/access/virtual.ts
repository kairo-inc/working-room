import { createPatch } from "diff"
import { inject, injectable } from "tsyringe"

import { CoreConfig } from "@wr/core"
import {
  AccessGroupSource,
  FileDescriptorSource,
  FileHistorySource,
  mapFileDescriptorEntityToDomain,
  mapFileHistoryEntityToDomain,
} from "@wr/db"
import {
  BadRequestError,
  DomainFileDescriptor,
  DomainFileHistory,
  ImplementationError,
  InvalidChatFolderAccessError,
  InvalidPrivateFolderAccessError,
  InvalidRootFolderAccessError,
  MimeType,
  PageResult,
  PermissionDeniedError,
} from "@wr/shared"
import { randomId } from "@wr/shared-node"

import { BlobStore } from "../../blob"
import {
  FileAccessContext,
  FileAccessService,
  FileAccessServiceCopyFileArg,
  FileAccessServiceCreateChatFileArg,
  FileAccessServiceDeleteManyArg,
  FileAccessServiceDifferenceBlobArg,
  FileAccessServiceFindByNameOptions,
  FileAccessServiceFindByNameResult,
  FileAccessServiceFindByTextOptions,
  FileAccessServiceFindByTextResult,
  FileAccessServiceListArg,
  FileAccessServiceListFileHistoryArg,
  FileAccessServiceMakeFolderArg,
  FileAccessServiceMoveFileArg,
  FileAccessServiceReadBlobArg,
  FileAccessServiceReadFileArg,
  FileAccessServiceReadHistoryArg,
  FileAccessServiceRenameArg,
  FileAccessServiceTraverseArg,
  FileAccessServiceUploadArg,
  FileAccessServiceWriteBlobAppendArg,
  FileAccessServiceWriteBlobNewArg,
  FileAccessServiceWriteBlobReplaceArg,
  FileAccessServiceWriteBlobRet,
  FileAccessServiceWriteFileAppendArg,
  FileAccessServiceWriteFileNewArg,
  FileAccessServiceWriteFileReplaceArg,
} from "../../types/access"
import { FileAccessListener } from "../../types/listener"

/**
 * FileAccessService responsible for check access permission and history making.
 */
@injectable()
export class FileAccessServiceImpl extends FileAccessService {
  constructor(
    @inject("FileAccessContext") private fileAccessContext: FileAccessContext,
    @inject("FileAccessListener") private fileAccessListener: FileAccessListener,
    @inject("FileDescriptorSource") private fileDescriptorSource: FileDescriptorSource,
    @inject("AccessGroupSource") private accessGroupSource: AccessGroupSource,
    @inject("FileHistorySource") private fileHistorySource: FileHistorySource,
    @inject("BlobStore") private blobStore: BlobStore,
    @inject("CoreConfig") private coreConfig: CoreConfig
  ) {
    super()
  }

  private async checkAccessPolicy(
    descId: string,
    requiredPermission: "read" | "write"
  ): Promise<{
    isAncestorOfAllowedFolder: boolean
    hasAllowedPolicy: boolean
    isUnderOtherUserPrivate: boolean
  }> {
    // Access rules.
    // 1. If a user has a read or write access policy to the folder A, it means the user can read all the ancestors of the folder A and all the files and folders under the folder A.
    // 2. If a user has a write access policy to the folder A, it means the user can read all the ancestors of the folder A and can write all the files and folders under the folder A.
    // 3. If a user has a write access policy to the folder A, user can write the folder A like renaming, moving, deleting, and creating new file/folder under the folder A.
    // 4. If a user has a read or write access policy to the folder A, user can not read folders that are not ancestors of the folder A and files/folders that are not under the folder A.
    // 5. User can not access other user's private folder in any case, even if the user has access policy to the folder A which is ancestor of other user's private folder.

    const { userId } = this.fileAccessContext
    const desc = await this.fileDescriptorSource.find("EntityFileDescriptor", { where: { id: descId } })
    const pathIdList = (desc.pathIds?.split("/") || []).filter((id) => id.trim().length > 0)

    // Check policies that includes the descId.
    // Write permission implies read permission (access rule #1 and #2).
    const policies = await this.accessGroupSource.exists({
      where: {
        users: { some: { id: userId } },
        resources: { some: { id: { in: pathIdList } } },
        ...(requiredPermission === "write" ? { write: true } : { OR: [{ read: true }, { write: true }] }),
      },
    })

    const isUnderOtherUserPrivate = await this.fileDescriptorSource.exists({
      where: {
        id: { in: pathIdList },
        OR: [{ privateRootOf: { id: { not: userId } } }],
      },
    })

    const isAncestorOfAllowedFolder = await this.accessGroupSource.exists({
      where: {
        users: { some: { id: userId } },
        resources: {
          some: {
            // Exclude my self to avoid counting the folder A as ancestor of the folder A.
            id: { not: descId },
            pathIds: { contains: descId },
            isDirectory: true,
          },
        },
      },
    })
    return { isAncestorOfAllowedFolder, hasAllowedPolicy: policies, isUnderOtherUserPrivate }
  }

  // White list based access restriction. If the user doesn't have access to the file, throw an error.
  async checkAccessPolicyAndThrow(descId: string, requiredPermission: "read" | "write"): Promise<void> {
    const { isAncestorOfAllowedFolder, hasAllowedPolicy, isUnderOtherUserPrivate } = await this.checkAccessPolicy(
      descId,
      requiredPermission
    )

    // Check descId is ancestor of any policies.
    // Only allowd to read folders that are ancestors of the folder that user has access to.
    if (!(isAncestorOfAllowedFolder && requiredPermission === "read") && !hasAllowedPolicy) {
      throw new PermissionDeniedError("You don't have access to this file")
    } else if (isUnderOtherUserPrivate) {
      throw new PermissionDeniedError("You don't have access to this file")
    }
  }

  private async checkParentWriteAccess(parentId: string | null): Promise<void> {
    if (!parentId) {
      throw new PermissionDeniedError("You don't have access to this file")
    }
    await this.checkAccessPolicyAndThrow(parentId, "write")
  }

  private async recordHistory(descId: string, operation: "create" | "edit" | "move" | "delete", blobHash?: string | null): Promise<void> {
    await this.fileHistorySource.create({
      data: {
        fileDescriptor: { connect: { id: descId } },
        operation,
        user: { connect: { id: this.fileAccessContext.userId } },
        ...(blobHash != null ? { blobHash } : {}),
      },
    })
  }

  private async readBlobHash(blobHash: string): Promise<ArrayBuffer> {
    const content = await this.blobStore.getBlobHash(blobHash)
    return new Uint8Array(content).buffer
  }

  private async newChatFile(arg: {
    chatId: string
    fileName: string
    content: ArrayBuffer
    mimeType: MimeType
  }): Promise<DomainFileDescriptor> {
    const { chatId, fileName, content, mimeType } = arg
    const { userId } = this.fileAccessContext
    const userPrivateFolder = await this.fileDescriptorSource.find("EntityFileDescriptor", {
      where: { privateRootOf: { id: userId } },
    })

    // Create chat root folder if not exists
    let chatFolderId: string
    const chatFolderExists = await this.fileDescriptorSource.findIfExists("EntityFileDescriptor", {
      where: { parentId: userPrivateFolder.id, isChatDir: true },
    })
    if (chatFolderExists) {
      chatFolderId = chatFolderExists.id
    } else {
      const id = randomId()
      const chatFolder = await this.fileDescriptorSource.create({
        data: {
          id,
          blobHash: await this.blobStore.createBlobHash(new ArrayBuffer(0)),
          birthtime: new Date(),
          mtime: new Date(),
          name: `chat_files`,
          isDirectory: true,
          mimeType: "inode/directory",
          size: 0,
          pathIds: `${userPrivateFolder.pathIds}/${id}`,
          parent: { connect: { id: userPrivateFolder.id } },
          owner: { connect: { id: userId } },
          isChatDir: true,
        },
      })
      chatFolderId = chatFolder.id
    }

    let thisChatFolderId: string
    const thisChatFolder = await this.fileDescriptorSource.findIfExists("EntityFileDescriptor", {
      where: { parent: { id: chatFolderId }, chats: { some: { id: chatId } } },
    })
    if (thisChatFolder) {
      thisChatFolderId = thisChatFolder.id
    } else {
      const id = randomId()
      const newChatFolder = await this.fileDescriptorSource.create({
        data: {
          id,
          blobHash: await this.blobStore.createBlobHash(new ArrayBuffer(0)),
          birthtime: new Date(),
          mtime: new Date(),
          name: chatId,
          isDirectory: true,
          mimeType: "inode/directory",
          size: 0,
          pathIds: `${userPrivateFolder.pathIds}/${chatFolderId}/${id}`,
          parent: { connect: { id: chatFolderId } },
          owner: { connect: { id: userId } },
          chats: { connect: { id: chatId } },
        },
      })
      thisChatFolderId = newChatFolder.id
    }

    return await this.newFile({
      parentDescId: thisChatFolderId,
      fileName,
      content,
      mimeType,
      chatId,
    })
  }

  private async newFile(arg: {
    parentDescId: string
    fileName: string
    content: ArrayBuffer
    mimeType: MimeType
    chatId?: string
  }): Promise<DomainFileDescriptor> {
    const { parentDescId, fileName, content, mimeType, chatId } = arg
    const { userId } = this.fileAccessContext
    const parentFolder = await this.fileDescriptorSource.find("EntityFileDescriptor", { where: { id: parentDescId } })
    const blobHash = await this.blobStore.createBlobHash(content)

    const id = randomId()
    const file = await this.fileDescriptorSource.create({
      data: {
        id,
        parent: { connect: { id: parentDescId } },
        blobHash,
        birthtime: new Date(),
        mtime: new Date(),
        name: fileName,
        isDirectory: false,
        mimeType,
        size: content.byteLength,
        pathIds: `${parentFolder.pathIds}/${id}`,
        owner: { connect: { id: userId } },
        chats: chatId ? { connect: { id: chatId } } : undefined,
      },
    })
    return mapFileDescriptorEntityToDomain(file)
  }

  private async appendFile(descId: string, content: ArrayBuffer): Promise<DomainFileDescriptor> {
    const { blobHash } = await this.fileDescriptorSource.find("EntityFileDescriptor", { where: { id: descId } })
    const blob = await this.blobStore.getBlobHash(blobHash)
    const newBlob = new Uint8Array(blob.byteLength + content.byteLength)
    newBlob.set(new Uint8Array(blob), 0)
    newBlob.set(new Uint8Array(content), blob.byteLength)
    const newBlobHash = await this.blobStore.createBlobHash(newBlob.buffer)
    const updated = await this.fileDescriptorSource.update({
      where: { id: descId },
      data: {
        blobHash: newBlobHash,
        mtime: new Date(),
        size: newBlob.byteLength,
      },
    })
    return mapFileDescriptorEntityToDomain(updated)
  }

  private async replaceFile(descId: string, oldContent: ArrayBuffer, newContent: ArrayBuffer): Promise<DomainFileDescriptor> {
    const desc = await this.fileDescriptorSource.find("EntityFileDescriptor", { where: { id: descId } })
    const currentBlob = await this.blobStore.getBlobHash(desc.blobHash)
    const currentContent = new TextDecoder().decode(currentBlob)
    const replaceText = new TextDecoder().decode(oldContent)
    const newContentText = new TextDecoder().decode(newContent)

    const index = currentContent.indexOf(replaceText)
    if (index === -1) {
      throw new BadRequestError(`The content to be replaced does not exist in the file.`)
    }

    const updatedContent = currentContent.slice(0, index) + newContentText + currentContent.slice(index + replaceText.length)
    const newBlobHash = await this.blobStore.createBlobHash(new TextEncoder().encode(updatedContent).buffer)
    const updated = await this.fileDescriptorSource.update({
      where: { id: descId },
      data: {
        blobHash: newBlobHash,
        mtime: new Date(),
        size: new Blob([updatedContent]).size,
      },
    })
    return mapFileDescriptorEntityToDomain(updated)
  }

  private async deleteFileRecord(descId: string): Promise<DomainFileDescriptor | null> {
    const desc = await this.fileDescriptorSource.find("EntityFileDescriptor", { where: { id: descId } })
    if (desc) {
      if (desc.isDirectory) {
        throw new BadRequestError(`Not a file: ${descId}`)
      }
      await this.fileDescriptorSource.delete({ where: { id: descId } })
      return mapFileDescriptorEntityToDomain(desc)
    }
    return null
  }

  private async deleteFolderRecord(descId: string): Promise<DomainFileDescriptor[]> {
    const desc = await this.fileDescriptorSource.find("EntityFileDescriptor", { where: { id: descId } })
    if (desc) {
      const { userId } = this.fileAccessContext
      const isUserPrivateFolder = await this.fileDescriptorSource.exists({
        where: { id: descId, privateRootOf: { id: userId }, isDirectory: true },
      })
      if (desc.isDirectory) {
        if (desc.isRoot) {
          throw new InvalidRootFolderAccessError(`Cannot delete root folder.`)
        } else if (isUserPrivateFolder) {
          throw new InvalidPrivateFolderAccessError(`Cannot delete user private folder.`)
        } else if (desc.isChatDir) {
          throw new InvalidChatFolderAccessError(`Cannot delete chat folder.`)
        }
        await this.fileDescriptorSource.delete({ where: { id: descId } })
        await this.fileDescriptorSource.deleteMany({ where: { pathIds: { contains: descId } } })

        // Get all deleted folders and files for response
        const deletedEntities = await this.fileDescriptorSource.findAll("EntityFileDescriptor", {
          where: { pathIds: { contains: descId }, deletedAt: undefined },
        })
        return deletedEntities.map(mapFileDescriptorEntityToDomain)
      } else {
        throw new BadRequestError(`Not a folder: ${descId}`)
      }
    }
    return []
  }

  private async mkFolder(arg: { parentDescId: string; folderName: string }): Promise<DomainFileDescriptor> {
    const { parentDescId, folderName } = arg
    const { userId } = this.fileAccessContext
    const parent = await this.fileDescriptorSource.find("EntityFileDescriptor", { where: { id: parentDescId } })
    const blobHash = await this.blobStore.createBlobHash(new ArrayBuffer(0))

    const id = randomId()
    const folder = await this.fileDescriptorSource.create({
      data: {
        id,
        parent: { connect: { id: parentDescId } },
        blobHash,
        birthtime: new Date(),
        mtime: new Date(),
        name: folderName,
        isDirectory: true,
        mimeType: "inode/directory",
        size: 0,
        pathIds: `${parent.pathIds}/${id}`,
        owner: { connect: { id: userId } },
      },
    })
    return mapFileDescriptorEntityToDomain(folder)
  }

  private async mkRootFolder(): Promise<DomainFileDescriptor> {
    const blobHash = await this.blobStore.createBlobHash(new ArrayBuffer(0))
    const count = await this.fileDescriptorSource.count({ where: { isRoot: true } })
    if (count === 1) {
      const root = await this.fileDescriptorSource.find("EntityFileDescriptor", { where: { isRoot: true } })
      return mapFileDescriptorEntityToDomain(root)
    } else {
      if (count > 1) {
        throw new BadRequestError(`Multiple root folders exist.`)
      }
    }

    const id = randomId()
    const desc = await this.fileDescriptorSource.create({
      data: {
        id,
        name: "root",
        isDirectory: true,
        isRoot: true,
        birthtime: new Date(),
        mtime: new Date(),
        blobHash,
        mimeType: "inode/directory",
        size: 0,
        pathIds: `/${id}`,
      },
    })
    return mapFileDescriptorEntityToDomain(desc)
  }

  private async move(arg: { descId: string; targetFolderId: string; newName?: string }): Promise<DomainFileDescriptor> {
    const { descId, targetFolderId, newName } = arg
    const file = await this.fileDescriptorSource.find("EntityFileDescriptor", { where: { id: descId } })
    const parentFolder = await this.fileDescriptorSource.find("EntityFileDescriptor", { where: { id: targetFolderId } })
    const newDesc = await this.fileDescriptorSource.update({
      where: { id: descId },
      data: {
        parent: { connect: { id: targetFolderId } },
        name: newName || file.name,
        pathIds: `${parentFolder.pathIds}/${descId}`,
        mtime: new Date(),
      },
    })

    if (file.isDirectory) {
      // Update pathIds of all children if it's a folder
      let page = 0
      while (true) {
        const { data } = await this.fileDescriptorSource.findMany("EntityFileDescriptor", {
          where: {
            id: { not: descId },
            pathIds: { contains: descId },
            // NOTE: Include deleted files to update pathIds correctly when a file is moved and then deleted.
            deletedAt: undefined,
          },
          take: 100,
          page: page++,
          sortBy: "id",
        })
        if (data.length === 0) {
          break
        }
        await Promise.all(
          data.map(async (child) => {
            const newPathIds = child.pathIds.replace(file.pathIds, newDesc.pathIds)
            return await this.fileDescriptorSource.update({
              where: { id: child.id },
              data: {
                pathIds: newPathIds,
                mtime: new Date(),
              },
            })
          })
        )
      }
    }

    return mapFileDescriptorEntityToDomain(newDesc)
  }

  private async copy(arg: { descId: string; newName?: string }): Promise<DomainFileDescriptor> {
    const { descId, newName } = arg
    const file = await this.fileDescriptorSource.find("EntityFileDescriptor", { where: { id: descId } })
    if (!file.parentId) {
      throw new ImplementationError(`Never reach here: file without parentId. descId=${descId}`)
    }

    if (file.isDirectory) {
      throw new BadRequestError(`You cannot copy a folder. descId=${descId}`)
    }

    const { userId } = this.fileAccessContext
    const newId = randomId()
    const parentFolder = await this.fileDescriptorSource.find("EntityFileDescriptor", { where: { id: file.parentId } })
    const [name, ext] = file.name.split(/(?=\.[^\.]+$)/)
    const newDesc = await this.fileDescriptorSource.create({
      data: {
        id: newId,
        parent: { connect: { id: file.parentId } },
        blobHash: file.blobHash,
        birthtime: new Date(),
        mtime: new Date(),
        name: newName || `${name}_copy${ext || ""}`,
        isDirectory: file.isDirectory,
        mimeType: file.mimeType,
        size: file.size,
        pathIds: `${parentFolder.pathIds}/${newId}`,
        owner: { connect: { id: userId } },
      },
    })
    return mapFileDescriptorEntityToDomain(newDesc)
  }

  async rootDescriptor(): Promise<DomainFileDescriptor> {
    const root = await this.fileDescriptorSource.find("EntityFileDescriptor", { where: { isRoot: true } })
    return mapFileDescriptorEntityToDomain(root)
  }

  async getDescriptor(descId: string): Promise<DomainFileDescriptor> {
    await this.checkAccessPolicyAndThrow(descId, "read")
    const descriptor = await this.fileDescriptorSource.find("EntityFileDescriptor", { where: { id: descId } })
    return mapFileDescriptorEntityToDomain(descriptor)
  }

  async buildReadablePath(descId: string): Promise<string> {
    const desc = await this.fileDescriptorSource.find("EntityFileDescriptor", { where: { id: descId } })
    const ancestors = await this.fileDescriptorSource.findAll("EntityFileDescriptor", {
      where: { id: { in: desc.pathIds.split("/").filter(Boolean) } },
    })
    const sortedAncestors = ancestors.sort((a, b) => a.pathIds.localeCompare(b.pathIds))
    const path = sortedAncestors.map((ancestor) => ancestor.name).join("/")
    return `/${path}`
  }

  async upload(arg: FileAccessServiceUploadArg): Promise<DomainFileDescriptor> {
    const { file, parentDescId } = arg
    await this.checkAccessPolicyAndThrow(parentDescId, "write")

    const desc = await this.newFile({
      parentDescId,
      fileName: file.name,
      content: await file.arrayBuffer(),
      mimeType: file.type as MimeType,
    })

    await this.recordHistory(desc.id, "create", desc.blobHash)

    return desc
  }

  // Everyone can create root folder, so no need to check access policy here.
  async createRootFolder(): Promise<DomainFileDescriptor> {
    return await this.mkRootFolder()
  }

  async createPrivateFolder(): Promise<DomainFileDescriptor> {
    const { userId } = this.fileAccessContext
    const privateRoot = await this.fileDescriptorSource.findIfExists("EntityFileDescriptor", {
      where: { privateRootOf: { id: userId }, isDirectory: true },
    })
    if (privateRoot) {
      return mapFileDescriptorEntityToDomain(privateRoot)
    }

    const rootDesc = await this.mkRootFolder()
    const blobHash = await this.blobStore.createBlobHash(new ArrayBuffer(0))
    const id = randomId()
    const desc = await this.fileDescriptorSource.create({
      data: {
        id,
        name: `private`,
        isDirectory: true,
        parent: { connect: { id: rootDesc.id } },
        birthtime: new Date(),
        mtime: new Date(),
        blobHash,
        mimeType: "inode/directory",
        size: 0,
        pathIds: `${rootDesc.pathIds}/${id}`,
        // owner: { connect: { id: userId } },
        // Potentially user does not exist before creating private root, so connect to user after user is created.
        // privateRootOf: { connect: { id: userId } },
      },
    })
    return mapFileDescriptorEntityToDomain(desc)
  }

  // Everyone can create chat file into their own chat, so no need to check access policy here.
  async createChatFile(arg: FileAccessServiceCreateChatFileArg): Promise<DomainFileDescriptor> {
    const { chatId, fileName, content, mimeType } = arg
    const desc = await this.newChatFile({
      chatId,
      fileName,
      content,
      mimeType,
    })
    await this.recordHistory(desc.id, "create", desc.blobHash)
    return desc
  }

  async list(arg: FileAccessServiceListArg): Promise<PageResult<DomainFileDescriptor>> {
    const { descId, sortBy, sortDirection, page, take } = arg
    const { isAncestorOfAllowedFolder, hasAllowedPolicy, isUnderOtherUserPrivate } = await this.checkAccessPolicy(descId, "read")

    const folder = await this.fileDescriptorSource.find("EntityFileDescriptor", { where: { id: descId } })
    if (!folder.isDirectory) {
      throw new BadRequestError(`Not a folder: ${descId}`)
    } else if (!hasAllowedPolicy && !isAncestorOfAllowedFolder) {
      throw new PermissionDeniedError("You don't have access to this folder")
    } else if (isUnderOtherUserPrivate) {
      throw new PermissionDeniedError("You don't have access to this folder")
    }

    const { userId } = this.fileAccessContext
    const otherUserPrivateFolderIds = await this.fileDescriptorSource.findAll("EntityFileDescriptor", {
      where: {
        privateRootOf: { id: { not: userId } },
      },
    })

    if (hasAllowedPolicy) {
      const { data, ...rest } = await this.fileDescriptorSource.findMany("EntityFileDescriptor", {
        where: {
          parentId: descId,
          // Filter out files that are under other user's private folders
          AND:
            otherUserPrivateFolderIds.length > 0
              ? otherUserPrivateFolderIds.map(({ id }) => ({ pathIds: { not: { contains: id } } }))
              : undefined,
        },
        sortBy,
        sortDirection,
        page,
        take,
      })
      return { data: data.map(mapFileDescriptorEntityToDomain), ...rest }
    } else if (isAncestorOfAllowedFolder) {
      // visibleFolderIds can be visible even if they are not under the folder A,
      // because if a user has access to the folder A, the user can also see all the ancestors of the folder A.
      const visiblePolicies = await this.accessGroupSource.findAll("EntityAccessGroup", {
        where: {
          users: { some: { id: userId } },
          resources: {
            some: { pathIds: { contains: descId }, isDirectory: true },
          },
        },
      })
      const visibleFolderIds = visiblePolicies
        .flatMap((policy) => policy.resources.map((res) => res.pathIds.split("/").filter(Boolean)))
        .flat()
      const { data, ...rest } = await this.fileDescriptorSource.findMany("EntityFileDescriptor", {
        where: {
          parentId: descId,
          id: { in: visibleFolderIds },
          // Filter out files that are under other user's private folders
          AND:
            otherUserPrivateFolderIds.length > 0
              ? otherUserPrivateFolderIds.map(({ id }) => ({ pathIds: { not: { contains: id } } }))
              : undefined,
        },
        sortBy,
        sortDirection,
        page,
        take,
      })
      return { data: data.map(mapFileDescriptorEntityToDomain), ...rest }
    }
    return { data: [], count: 0, nextPage: null, maxPage: 1 }
  }

  async traverse(arg: FileAccessServiceTraverseArg): Promise<DomainFileDescriptor[]> {
    const { descId, maxDepth = 0, maxItems = 100 } = arg
    const { isAncestorOfAllowedFolder, hasAllowedPolicy, isUnderOtherUserPrivate } = await this.checkAccessPolicy(descId, "read")

    const folder = await this.fileDescriptorSource.find("EntityFileDescriptor", { where: { id: descId } })
    if (!folder.isDirectory) {
      throw new BadRequestError(`Not a folder: ${descId}`)
    } else if (!hasAllowedPolicy && !isAncestorOfAllowedFolder) {
      throw new PermissionDeniedError("You don't have access to this folder")
    } else if (isUnderOtherUserPrivate) {
      throw new PermissionDeniedError("You don't have access to this folder")
    }

    const collected: DomainFileDescriptor[] = []
    const collectItems = async (descId: string, currentDepth: number, maxDepth: number, maxItems: number): Promise<void> => {
      if (collected.length >= maxItems) return
      const { userId } = this.fileAccessContext
      const { isAncestorOfAllowedFolder, hasAllowedPolicy } = await this.checkAccessPolicy(descId, "read")
      const remaining = maxItems - collected.length
      let children: DomainFileDescriptor[]
      const otherUserPrivateFolderIds = await this.fileDescriptorSource.findAll("EntityFileDescriptor", {
        where: {
          privateRootOf: { id: { not: userId } },
        },
      })

      if (hasAllowedPolicy) {
        const { data } = await this.fileDescriptorSource.findMany("EntityFileDescriptor", {
          where: {
            parentId: descId,
            // Filter out files that are under other user's private folders
            AND:
              otherUserPrivateFolderIds.length > 0
                ? otherUserPrivateFolderIds.map(({ id }) => ({ pathIds: { not: { contains: id } } }))
                : undefined,
          },
          take: remaining,
        })
        children = data.map(mapFileDescriptorEntityToDomain)
      } else if (isAncestorOfAllowedFolder) {
        // visibleFolderIds can be visible even if they are not under the folder A,
        // because if a user has access to the folder A, the user can also see all the ancestors of the folder A.
        const visiblePolicies = await this.accessGroupSource.findAll("EntityAccessGroup", {
          where: {
            users: { some: { id: userId } },
            resources: {
              some: { pathIds: { contains: descId }, isDirectory: true },
            },
          },
        })
        const visibleFolderIds = visiblePolicies
          .flatMap((policy) => policy.resources.map((res) => res.pathIds.split("/").filter(Boolean)))
          .flat()
        const { data } = await this.fileDescriptorSource.findMany("EntityFileDescriptor", {
          where: {
            parentId: descId,
            id: { in: visibleFolderIds },
            // Filter out files that are under other user's private folders
            AND:
              otherUserPrivateFolderIds.length > 0
                ? otherUserPrivateFolderIds.map(({ id }) => ({ pathIds: { not: { contains: id } } }))
                : undefined,
          },
          take: remaining,
        })
        children = data.map(mapFileDescriptorEntityToDomain)
      } else {
        // Nothing to show.
        return
      }

      for (const child of children) {
        if (collected.length >= maxItems) break
        collected.push(child)
        if (child.isFolder && currentDepth < maxDepth) {
          await collectItems(child.id, currentDepth + 1, maxDepth, maxItems)
        }
      }
    }
    await collectItems(descId, 0, maxDepth, maxItems)
    return collected
  }

  async readFile(arg: FileAccessServiceReadFileArg): Promise<ArrayBuffer> {
    const { id } = arg
    await this.checkAccessPolicyAndThrow(id, "read")
    const descriptor = await this.fileDescriptorSource.find("EntityFileDescriptor", { where: { id } })
    return this.readBlobHash(descriptor.blobHash)
  }

  async readBlobStream(arg: FileAccessServiceReadBlobArg): Promise<NodeJS.ReadableStream> {
    const { blobHash } = arg
    return this.blobStore.getBlobHashStream(blobHash)
  }

  async readBlob(arg: FileAccessServiceReadBlobArg): Promise<ArrayBuffer> {
    const { blobHash } = arg
    return this.readBlobHash(blobHash)
  }

  async listFileHistory(arg: FileAccessServiceListFileHistoryArg): Promise<PageResult<DomainFileHistory>> {
    const { descId, page, take } = arg
    await this.checkAccessPolicyAndThrow(descId, "read")
    const { data, ...rest } = await this.fileHistorySource.findMany("EntityFileHistory", {
      where: { fileDescriptor: { id: descId } },
      sortBy: "createdAt",
      sortDirection: "desc",
      page,
      take,
    })
    return { data: data.map(mapFileHistoryEntityToDomain), ...rest }
  }

  async readHistory(arg: FileAccessServiceReadHistoryArg): Promise<DomainFileHistory> {
    const { historyId } = arg
    const history = await this.fileHistorySource.find("EntityFileHistory", { where: { id: historyId } })
    await this.checkAccessPolicyAndThrow(history.fileDescriptorId, "read")
    return mapFileHistoryEntityToDomain(history)
  }

  async deleteMany(arg: FileAccessServiceDeleteManyArg): Promise<void> {
    const { ids, onlyFolders, onlyFiles } = arg
    const descList = await this.fileDescriptorSource.findAll("EntityFileDescriptor", { where: { id: { in: ids } } })

    if (onlyFolders && descList.some((desc) => !desc.isDirectory)) {
      throw new BadRequestError(`Some of the specified ids are not folders.`)
    } else if (onlyFiles && descList.some((desc) => desc.isDirectory)) {
      throw new BadRequestError(`Some of the specified ids are not files.`)
    }

    // Check permission before bulk deletion.
    for (const id of ids) {
      await this.checkAccessPolicyAndThrow(id, "write")
    }

    for (const desc of descList) {
      if (desc.isDirectory) {
        await this.deleteFolderRecord(desc.id)
      } else {
        await this.deleteFileRecord(desc.id)
      }
      await this.recordHistory(desc.id, "delete")
    }
  }

  async makeFolder(arg: FileAccessServiceMakeFolderArg): Promise<DomainFileDescriptor> {
    const { parentDescId, folderName } = arg
    await this.checkAccessPolicyAndThrow(parentDescId, "write")

    const desc = await this.mkFolder({ parentDescId, folderName })
    await this.recordHistory(desc.id, "create", desc.blobHash)

    return desc
  }

  async writeFileNew(arg: FileAccessServiceWriteFileNewArg): Promise<DomainFileDescriptor> {
    const { parentDescId, fileName, content, mimeType } = arg
    await this.checkAccessPolicyAndThrow(parentDescId, "write")

    const desc = await this.newFile({ parentDescId, fileName, content, mimeType })
    await this.recordHistory(desc.id, "create", desc.blobHash)

    return desc
  }

  async writeBlobNew(arg: FileAccessServiceWriteBlobNewArg): Promise<string> {
    const { content } = arg
    // No history. Blobs are immutable, so we don't need to keep history for them.
    return this.blobStore.createBlobHash(content)
  }

  async writeFileAppend(arg: FileAccessServiceWriteFileAppendArg): Promise<DomainFileDescriptor> {
    const { id, content } = arg
    await this.checkAccessPolicyAndThrow(id, "write")

    const desc = await this.appendFile(id, new TextEncoder().encode(content).buffer)
    await this.recordHistory(desc.id, "edit", desc.blobHash)

    return desc
  }

  async writeBlobAppend(arg: FileAccessServiceWriteBlobAppendArg): Promise<FileAccessServiceWriteBlobRet> {
    const { blobHash, content } = arg

    const currentBlob = await this.readBlobHash(blobHash)
    const currentText = new TextDecoder().decode(currentBlob)
    const newBlob = currentText + content
    const newBlobHash = await this.blobStore.createBlobHash(new TextEncoder().encode(newBlob).buffer)
    return { blobHash: newBlobHash }
  }

  async writeFileReplace(arg: FileAccessServiceWriteFileReplaceArg): Promise<DomainFileDescriptor> {
    const { id, oldContent, newContent } = arg
    await this.checkAccessPolicyAndThrow(id, "write")

    const desc = await this.replaceFile(id, new TextEncoder().encode(oldContent).buffer, new TextEncoder().encode(newContent).buffer)
    await this.recordHistory(desc.id, "edit", desc.blobHash)
    return desc
  }

  async writeBlobReplace(arg: FileAccessServiceWriteBlobReplaceArg): Promise<FileAccessServiceWriteBlobRet> {
    const { blobHash, oldContent, newContent } = arg
    const currentBlob = await this.readBlobHash(blobHash)
    const currentText = new TextDecoder().decode(currentBlob)
    const index = currentText.indexOf(oldContent)
    if (index === -1) {
      throw new BadRequestError(`Old content not found in the current blob.`)
    }
    const updatedText = currentText.slice(0, index) + newContent + currentText.slice(index + oldContent.length)
    const newBlobHash = await this.blobStore.createBlobHash(new TextEncoder().encode(updatedText).buffer)
    return { blobHash: newBlobHash }
  }

  async differenceBlob(arg: FileAccessServiceDifferenceBlobArg): Promise<string> {
    const { sourceBlobHash, targetBlobHash, filename } = arg
    const patch = createPatch(
      filename || "file",
      new TextDecoder().decode(await this.readBlobHash(sourceBlobHash)),
      new TextDecoder().decode(await this.readBlobHash(targetBlobHash))
    )
    return patch
  }

  async moveFile(arg: FileAccessServiceMoveFileArg): Promise<DomainFileDescriptor> {
    const { descId, parentDescId, newName } = arg
    const targetDesc = await this.fileDescriptorSource.find("EntityFileDescriptor", { where: { id: descId } })

    await this.checkParentWriteAccess(targetDesc.parentId)
    await this.checkAccessPolicyAndThrow(descId, "write")
    await this.checkAccessPolicyAndThrow(parentDescId, "write")

    const targetParentDesc = await this.fileDescriptorSource.find("EntityFileDescriptor", { where: { id: parentDescId } })
    const isMovingIntoDescendant = targetParentDesc.pathIds.split("/").includes(descId)
    if (isMovingIntoDescendant) {
      throw new BadRequestError(`Cannot move a folder into its own descendant.`)
    } else if (!targetParentDesc.isDirectory) {
      throw new BadRequestError(`Cannot move a file/folder into a file.`)
    } else if (targetDesc.isChatDir) {
      throw new InvalidChatFolderAccessError(`Cannot move a chat folder.`)
    }

    await this.move({ descId, targetFolderId: parentDescId, newName })
    const desc = await this.getDescriptor(descId)
    await this.recordHistory(desc.id, "move", desc.blobHash)

    return desc
  }

  async copyFile(arg: FileAccessServiceCopyFileArg): Promise<DomainFileDescriptor> {
    const { descId, newName } = arg
    await this.checkAccessPolicyAndThrow(descId, "write")

    const desc = await this.copy({ descId, newName })
    await this.recordHistory(desc.id, "create", desc.blobHash)
    return desc
  }

  async rename(arg: FileAccessServiceRenameArg): Promise<DomainFileDescriptor> {
    const { descId, newName } = arg
    const desc = await this.fileDescriptorSource.find("EntityFileDescriptor", { where: { id: descId } })
    await this.checkParentWriteAccess(desc.parentId)
    const updated = await this.fileDescriptorSource.update({
      where: { id: descId },
      data: {
        name: newName,
        mtime: new Date(),
      },
    })

    // NOTE: Not record rename operation in history, because rename doesn't change file content.
    return mapFileDescriptorEntityToDomain(updated)
  }

  async findByText(text: string, options?: FileAccessServiceFindByTextOptions): Promise<FileAccessServiceFindByTextResult> {
    const { userId } = this.fileAccessContext
    const { maxResults } = options || { maxResults: 100 }
    const { blobDir } = this.coreConfig
    const blobHashList = await this.blobStore.findByText(text, blobDir, { maxResults })

    // Get accessible folders for the user
    const policies = await this.accessGroupSource.findAll("EntityAccessGroup", {
      where: {
        users: {
          some: { id: userId },
        },
      },
    })

    const otherUserPrivateFolderIds = await this.fileDescriptorSource.findAll("EntityFileDescriptor", {
      where: {
        privateRootOf: { id: { not: userId } },
      },
    })

    const pathIdSet = new Set<string>(policies.flatMap((policy) => policy.resources.map((res) => res.id)))
    const uniquePathIdList = Array.from(pathIdSet)

    const { data, count } = await this.fileDescriptorSource.findMany("EntityFileDescriptor", {
      where: {
        OR: uniquePathIdList.map((pathId) => ({ pathIds: { contains: pathId } })),
        blobHash: { in: blobHashList },
        // Filter out files that are under other user's private folders
        AND:
          otherUserPrivateFolderIds.length > 0
            ? otherUserPrivateFolderIds.map(({ id }) => ({ pathIds: { not: { contains: id } } }))
            : undefined,
      },
      take: maxResults,
    })
    return { files: data.map(mapFileDescriptorEntityToDomain), totalCount: count }
  }

  async findByName(name: string, options?: FileAccessServiceFindByNameOptions): Promise<FileAccessServiceFindByNameResult> {
    const { userId } = this.fileAccessContext
    const { maxResults } = options || { maxResults: 100 }
    const policies = await this.accessGroupSource.findAll("EntityAccessGroup", {
      where: {
        users: {
          some: { id: userId },
        },
      },
    })

    const pathIdSet = new Set<string>(policies.flatMap((policy) => policy.resources.map((res) => res.id)))
    const uniquePathIdList = Array.from(pathIdSet)
    const { data, count } = await this.fileDescriptorSource.findMany("EntityFileDescriptor", {
      where: {
        OR: uniquePathIdList.map((pathId) => ({ pathIds: { contains: pathId } })),
        name: { contains: name },
      },
      take: maxResults,
    })
    return { files: data.map(mapFileDescriptorEntityToDomain), totalCount: count }
  }

  async restoreHistory(historyId: string): Promise<void> {
    const history = await this.fileHistorySource.find("EntityFileHistory", {
      where: { id: historyId },
    })
    await this.checkAccessPolicyAndThrow(history.fileDescriptorId, "write")

    if (history.blobHash) {
      await this.fileDescriptorSource.update({
        where: { id: history.fileDescriptorId },
        data: { blobHash: history.blobHash },
      })
      await this.fileHistorySource.deleteMany({
        where: {
          fileDescriptorId: history.fileDescriptorId,
          createdAt: { gt: history.createdAt },
        },
      })
    }
  }
}
