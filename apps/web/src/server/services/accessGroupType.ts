import { AccessGroupSortBy, UserSortBy } from "@wr/db"
import { PageArg, PageResult } from "@wr/shared"

import { AppAccessGroup } from "../../types/accessGroup"
import { AppFileDescriptorEssential } from "../../types/file"
import { AppUser } from "../../types/user"

export type AccessGroupServiceCreateArgs = {
  name: string
  description?: string
  resourceId: string
  write: boolean
  read: boolean
}

export type AccessGroupServiceDeleteArgs = {
  id: string
}

export type AccessGroupServiceEditArg = {
  id: string
  name?: string
  description?: string | null
  write?: boolean
  read?: boolean
  userIdsToAdd?: string[]
  userIdsToRemove?: string[]
  resourceIdsToAdd?: string[]
  resourceIdsToRemove?: string[]
}

export type AccessGroupServiceGetListArgs = PageArg<AccessGroupSortBy>

export type AccessGroupServiceGetArgs = {
  id: string
}

export type AccessGroupServiceGetUserListArgs = PageArg<UserSortBy> & {
  id: string
}

export type AccessGroupServiceGetResourceListArgs = {
  id: string
}

export abstract class AccessGroupService {
  abstract create(args: AccessGroupServiceCreateArgs): Promise<AppAccessGroup>
  abstract delete(args: AccessGroupServiceDeleteArgs): Promise<void>
  abstract edit(args: AccessGroupServiceEditArg): Promise<void>

  abstract get(args: AccessGroupServiceGetArgs): Promise<AppAccessGroup>
  abstract getList(args: AccessGroupServiceGetListArgs): Promise<PageResult<AppAccessGroup>>
  abstract getUserList(args: AccessGroupServiceGetUserListArgs): Promise<PageResult<AppUser>>
  abstract getResourceList(args: AccessGroupServiceGetResourceListArgs): Promise<AppFileDescriptorEssential[]>
}
