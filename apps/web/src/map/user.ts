import { EntityUser, EntityUserSetting } from "@wr/db"

import { AppUser, AppUserSetting } from "../types/user"

export const mapUserEntityToApp = (user: EntityUser): AppUser => {
  return {
    id: user.id,
    createdAt: user.createdAt,
    email: user.email,
    role: user.role,
    name: user.name,
  }
}

export const mapUserSettingEntityToApp = (user: EntityUserSetting): AppUserSetting => {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
  }
}
