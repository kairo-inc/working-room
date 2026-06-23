import { DomainFileDescriptor, MimeType } from "@wr/shared"

import { EntityFileDescriptor } from "../entities/fileDescriptor"

export const mapFileDescriptorEntityToDomain = (entity: EntityFileDescriptor): DomainFileDescriptor => {
  return {
    id: entity.id,
    name: entity.name,
    birthtime: entity.birthtime.getTime(),
    mtime: entity.mtime.getTime(),
    size: entity.size,
    mimeType: entity.mimeType as MimeType,
    isDirectory: entity.isDirectory,
    isRoot: entity.isRoot,
    blobHash: entity.blobHash,
    status: entity.status,
    pathIds: entity.pathIds,
    parentId: entity.parentId,
    isChatDir: entity.isChatDir,
    isPrivateRoot: !!entity.privateRootOf,
  }
}

type PartialEntityFileDescriptor = Omit<EntityFileDescriptor, "id" | "isModifying" | "status" | "privateRootOf">
export const mapFileDescriptorDomainToEntity = (domain: DomainFileDescriptor): PartialEntityFileDescriptor => {
  return {
    name: domain.name,
    birthtime: new Date(domain.birthtime),
    mtime: new Date(domain.mtime),
    size: domain.size,
    mimeType: domain.mimeType,
    isDirectory: domain.isDirectory,
    isRoot: domain.isRoot,
    blobHash: domain.blobHash,
    pathIds: domain.pathIds,
    parentId: domain.parentId,
    isChatDir: domain.isChatDir,
  }
}
