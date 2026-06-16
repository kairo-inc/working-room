import { EntityFileHistory } from "@wr/db"

import { AppFileHistory } from "../types/fileHistory"

export const mapFileHistoryEntityToApp = (entity: EntityFileHistory): AppFileHistory => {
  return {
    id: entity.id,
    createdAt: entity.createdAt,
    blobHash: entity.blobHash,
    operation: entity.operation,
    userEmail: entity.user?.email,
    userName: entity.user?.name,
  }
}
