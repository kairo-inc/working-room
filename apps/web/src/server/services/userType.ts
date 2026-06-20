import { UserSortBy } from "@wr/db"
import { PageArg, PageResult } from "@wr/shared"

import { AppUser, AppUserSetting } from "../../types/user"

export type UserServiceGetMySettingResult = AppUserSetting

export type UserServiceGetListArg = PageArg<UserSortBy> & {
  charContains?: string
}
export type UserServiceGetListResult = PageResult<AppUser>

export type UserServiceEditMySelfArg = {
  name?: string
}

export abstract class UserService {
  abstract getMySelf(): Promise<AppUser>
  abstract editMySelf(args: UserServiceEditMySelfArg): Promise<void>

  abstract getMySetting(): Promise<UserServiceGetMySettingResult>
  abstract getList(args: UserServiceGetListArg): Promise<UserServiceGetListResult>
}
