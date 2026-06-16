import { EntityAccessGroup } from "@wr/db"

import { AppAccessGroup } from "../types/accessGroup"

export const mapAccessGroupEntityToApp = (entity: EntityAccessGroup): AppAccessGroup => {
  return {
    id: entity.id,
    name: entity.name,
    isPersonal: entity.isPersonal,
    description: entity.description ?? undefined,
    read: entity.read,
    write: entity.write,
  }
}
