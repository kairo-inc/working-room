import { inject, injectable } from "tsyringe"

import { AccessGroupSource, UserSource } from "@wr/db"
import { BadRequestError, PageResult } from "@wr/shared"
import { getPrivateContext } from "@wr/shared-node"

import { mapAccessGroupEntityToApp } from "../../map/accessGroup"
import { mapFileDescriptorEntityToAppEssential } from "../../map/file"
import { mapUserEntityToApp } from "../../map/user"
import { AppAccessGroup } from "../../types/accessGroup"
import { AppFileDescriptorEssential } from "../../types/file"
import { AppUser } from "../../types/user"
import { guard } from "../guard"
import { Resolver } from "../resolver"
import {
  AccessGroupService,
  AccessGroupServiceCreateArgs,
  AccessGroupServiceDeleteArgs,
  AccessGroupServiceEditArg,
  AccessGroupServiceGetArgs,
  AccessGroupServiceGetListArgs,
  AccessGroupServiceGetResourceListArgs,
  AccessGroupServiceGetUserListArgs,
} from "./accessGroupType"

@injectable()
export class AccessGroupServiceImpl extends AccessGroupService {
  constructor(
    @inject("Resolver") private resolver: Resolver,
    @inject("UserSource") private userSource: UserSource,
    @inject("AccessGroupSource") private accessGroupSource: AccessGroupSource
  ) {
    super()
  }

  @guard({ onlyAccept: ["admin", "owner"] })
  async create(args: AccessGroupServiceCreateArgs): Promise<AppAccessGroup> {
    const { name, description, resourceId, write, read } = args
    const { tenantId, userId } = getPrivateContext()
    const fileAccessService = await this.resolver.resolveFileService()

    // Requires write permission for the resource to be added.
    await fileAccessService.checkAccessPolicyAndThrow({ descId: resourceId, requiredPermission: "write" })
    await fileAccessService.checkIsUnderSpecialDirAndThrow({ id: resourceId, isUnderChatDir: true, isUnderPrivateDir: true })

    const entity = await this.accessGroupSource.create({
      data: {
        name,
        description,
        write,
        read,
        tenant: { connect: { id: tenantId } },
        resources: { connect: { id: resourceId } },
        users: { connect: [{ id: userId }] },
      },
    })
    return mapAccessGroupEntityToApp(entity)
  }

  @guard({ onlyAccept: ["admin", "owner"] })
  async delete(args: AccessGroupServiceDeleteArgs): Promise<void> {
    const { id } = args
    const { tenantId } = getPrivateContext()

    const target = await this.accessGroupSource.find("EntityAccessGroup", {
      where: { id, tenantId },
    })

    // Check whether it's not a personal access group, which cannot be deleted.
    if (target.isPersonal) {
      throw new BadRequestError("Personal access groups cannot be deleted")
    }

    await this.accessGroupSource.delete({
      where: { id, tenantId },
    })
  }

  @guard({ onlyAccept: ["admin", "owner"] })
  async edit(args: AccessGroupServiceEditArg): Promise<void> {
    const { id, name, write, read, userIdsToAdd, userIdsToRemove, resourceIdsToAdd, resourceIdsToRemove } = args
    const { tenantId } = getPrivateContext()

    const updateData: Parameters<AccessGroupSource["update"]>[0]["data"] = {}
    if (name !== undefined) updateData.name = name
    if (write !== undefined) updateData.write = write
    if (read !== undefined) updateData.read = read
    if (userIdsToAdd) updateData.users = { connect: userIdsToAdd.map((userId) => ({ id: userId })) }
    if (userIdsToRemove) updateData.users = { disconnect: userIdsToRemove.map((userId) => ({ id: userId })) }
    if (resourceIdsToAdd) updateData.resources = { connect: resourceIdsToAdd.map((resourceId) => ({ id: resourceId })) }
    if (resourceIdsToRemove) updateData.resources = { disconnect: resourceIdsToRemove.map((resourceId) => ({ id: resourceId })) }

    // Requires write permission for the resource to be added or removed.
    if (resourceIdsToAdd || resourceIdsToRemove) {
      const fileAccessService = await this.resolver.resolveFileService()
      for (const resourceId of [...(resourceIdsToAdd ?? []), ...(resourceIdsToRemove ?? [])]) {
        await fileAccessService.checkAccessPolicyAndThrow({ descId: resourceId, requiredPermission: "write" })
      }
    }

    await this.accessGroupSource.update({
      where: { id, tenantId },
      data: updateData,
    })
  }

  async get(args: AccessGroupServiceGetArgs): Promise<AppAccessGroup> {
    const { id } = args
    const { tenantId } = getPrivateContext()
    const entity = await this.accessGroupSource.find("EntityAccessGroup", {
      where: { id, tenantId },
    })
    if (!entity) throw new Error("Access group not found")
    return mapAccessGroupEntityToApp(entity)
  }

  async getList(args: AccessGroupServiceGetListArgs): Promise<PageResult<AppAccessGroup>> {
    const { ...page } = args
    const { tenantId } = getPrivateContext()
    const { data, ...rest } = await this.accessGroupSource.findMany("EntityAccessGroup", {
      where: { tenantId },
      ...page,
    })
    return {
      data: data.map(mapAccessGroupEntityToApp),
      ...rest,
    }
  }

  async getUserList(args: AccessGroupServiceGetUserListArgs): Promise<PageResult<AppUser>> {
    const { id, ...page } = args
    const { tenantId } = getPrivateContext()
    const { data, ...rest } = await this.userSource.findMany("EntityUser", {
      where: { accessGroups: { some: { id } }, tenantId },
      ...page,
    })
    return {
      data: data.map(mapUserEntityToApp),
      ...rest,
    }
  }

  async getResourceList(args: AccessGroupServiceGetResourceListArgs): Promise<AppFileDescriptorEssential[]> {
    const { id } = args
    const { tenantId } = getPrivateContext()
    const accessGroup = await this.accessGroupSource.find("EntityAccessGroup", {
      where: { id, tenantId },
    })
    return accessGroup.resources.map(mapFileDescriptorEntityToAppEssential)
  }
}
