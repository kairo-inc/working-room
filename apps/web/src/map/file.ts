import { EntityFileDescriptor } from "@wr/db"
import { DomainFileDescriptor } from "@wr/shared"

import { AppFileDescriptor, AppFileDescriptorEssential } from "../types/file"

export const mapFileDescriptorEntityToAppEssential = (
  entity: Pick<EntityFileDescriptor, "id" | "name" | "mimeType" | "pathIds" | "isDirectory">
): AppFileDescriptorEssential => {
  return {
    id: entity.id,
    name: entity.name,
    isDirectory: entity.isDirectory,
    mimeType: entity.mimeType,
    pathIds: entity.pathIds || undefined,
  }
}

export const mapFileDescriptorEntityToApp = (entity: EntityFileDescriptor): AppFileDescriptor => {
  return {
    id: entity.id,
    birthtime: new Date(entity.birthtime),
    mtime: new Date(entity.mtime),
    name: entity.name,
    blobHash: entity.blobHash,
    mimeType: entity.mimeType,
    isDirectory: entity.isDirectory,
    isRoot: entity.isRoot,
    parentId: entity.parentId || undefined,
    pathIds: entity.pathIds,
    isChatDir: entity.isChatDir,
    isPrivateRoot: !!entity.privateRootOf,
  }
}

export const mapFileDescriptorDomainToApp = (entity: DomainFileDescriptor): AppFileDescriptor => {
  return {
    id: entity.id,
    birthtime: new Date(entity.birthtime),
    mtime: new Date(entity.mtime),
    name: entity.name,
    blobHash: entity.blobHash,
    mimeType: entity.mimeType,
    isDirectory: entity.isDirectory,
    isRoot: entity.isRoot,
    parentId: entity.parentId || undefined,
    pathIds: entity.pathIds,
    isChatDir: entity.isChatDir,
    isPrivateRoot: entity.isPrivateRoot,
  }
}
