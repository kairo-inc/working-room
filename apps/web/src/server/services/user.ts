import { inject, injectable } from "tsyringe"

import { UserSource } from "@wr/db"
import { getPrivateContext } from "@wr/shared-node"

import { mapUserEntityToApp, mapUserSettingEntityToApp } from "../../map/user"
import { AppUser } from "../../types/user"
import { guard } from "../guard"
import {
  UserService,
  UserServiceEditMySelfArg,
  UserServiceGetListArg,
  UserServiceGetListResult,
  UserServiceGetMySettingResult,
} from "./userType"

@injectable()
export class UserServiceImpl extends UserService {
  constructor(@inject("UserSource") private userSource: UserSource) {
    super()
  }

  async getMySelf(): Promise<AppUser> {
    const { userId } = getPrivateContext()
    const userEntity = await this.userSource.find("EntityUser", { where: { id: userId } })
    return mapUserEntityToApp(userEntity)
  }

  async editMySelf(args: UserServiceEditMySelfArg): Promise<void> {
    const { userId } = getPrivateContext()
    await this.userSource.update({ where: { id: userId }, data: { name: args.name } })
  }

  async getMySetting(): Promise<UserServiceGetMySettingResult> {
    const { userId } = getPrivateContext()
    const userEntity = await this.userSource.find("EntityUserSetting", { where: { id: userId } })
    return mapUserSettingEntityToApp(userEntity)
  }

  @guard({ onlyAccept: ["admin", "owner"] })
  async getList(args: UserServiceGetListArg): Promise<UserServiceGetListResult> {
    const { charContains, ...page } = args

    const hasQurery = charContains && charContains.trim().length > 0
    const { data, ...rest } = await this.userSource.findMany("EntityUser", {
      where: {
        OR: hasQurery ? [{ name: { contains: charContains } }, { email: { contains: charContains } }] : undefined,
      },
      ...page,
    })
    return {
      data: data.map(mapUserEntityToApp),
      ...rest,
    }
  }
}
