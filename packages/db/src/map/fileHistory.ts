import { DomainFileHistory } from "@wr/shared"

import { EntityFileHistory } from "../entities"

export const mapFileHistoryEntityToDomain = (entity: EntityFileHistory): DomainFileHistory => {
  return {
    id: entity.id,
    createdAt: entity.createdAt,
    operation: entity.operation,
    preview: entity.preview,
    blobHash: entity.blobHash,
    fileDescriptorId: entity.fileDescriptorId,
    user: entity.user
      ? {
          email: entity.user.email,
          name: entity.user.name,
        }
      : null,
  }
}
