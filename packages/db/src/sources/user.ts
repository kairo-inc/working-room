/* eslint-disable @typescript-eslint/no-explicit-any */
import type { Prisma, PrismaClient } from "@prisma/client"
import { inject, injectable } from "tsyringe"

import { ImplementationError, PageArg } from "@wr/shared"

import { EntityUser, EntityUserSecret, EntityUserSetting, UserSortBy } from "../entities/user"
import {
  BaseCreateArgs,
  BaseDatabaseSource,
  BaseDeleteArgs,
  BaseDeleteManyArgs,
  BaseFindAllArgs,
  BaseFindArgs,
  BaseFindManyArgs,
  BaseFindManyRet,
  BaseUpdateArgs,
  BaseUpsertArgs,
} from "./base"

type Selector = "EntityUser" | "EntityUserSecret" | "EntityUserSetting"

type CreateArgs = BaseCreateArgs<Prisma.UserCreateInput>
type UpdateArgs = BaseUpdateArgs<Prisma.UserUpdateInput, Prisma.UserWhereUniqueInput>
type UpsertArgs = BaseUpsertArgs<Prisma.UserCreateInput, Prisma.UserUpdateInput, Prisma.UserWhereUniqueInput>
type FindArgs = BaseFindArgs<Prisma.UserWhereInput>
type FindAllArgs = BaseFindAllArgs<Prisma.UserWhereInput, UserSortBy>
type FindManyArgs = BaseFindManyArgs<Prisma.UserWhereInput, UserSortBy>
type FindManyResultUser = BaseFindManyRet<EntityUser>
type FindManyResultUserSecret = BaseFindManyRet<EntityUserSecret>
type DeleteArgs = BaseDeleteArgs<Prisma.UserWhereUniqueInput>
type DeleteManyArgs = BaseDeleteManyArgs<Prisma.UserWhereInput>

export abstract class UserSource extends BaseDatabaseSource {
  protected getSelector(selector: Selector) {
    switch (selector) {
      case "EntityUser":
        return EntityUser.select
      case "EntityUserSecret":
        return EntityUserSecret.select
      case "EntityUserSetting":
        return EntityUserSetting.select
      default:
        throw new ImplementationError(`Unknown selector: ${selector}`)
    }
  }

  abstract create(args: CreateArgs): Promise<EntityUser>
  abstract update(args: UpdateArgs): Promise<EntityUser>
  abstract upsert(args: UpsertArgs): Promise<EntityUser>
  abstract delete(args: DeleteArgs): Promise<void>
  abstract deleteMany(args: DeleteManyArgs): Promise<void>
  abstract count(args: FindArgs): Promise<number>
  abstract exists(args: FindArgs): Promise<boolean>
  abstract find(selector: "EntityUser", args: FindArgs): Promise<EntityUser>
  abstract find(selector: "EntityUserSecret", args: FindArgs): Promise<EntityUserSecret>
  abstract find(selector: "EntityUserSetting", args: FindArgs): Promise<EntityUserSetting>

  abstract findIfExists(selector: "EntityUser", args: FindArgs): Promise<EntityUser | null>
  abstract findIfExists(selector: "EntityUserSecret", args: FindArgs): Promise<EntityUserSecret | null>
  abstract findIfExists(selector: "EntityUserSetting", args: FindArgs): Promise<EntityUserSetting | null>

  abstract findAll(selector: "EntityUser", args: FindAllArgs): Promise<EntityUser[]>
  abstract findAll(selector: "EntityUserSecret", args: FindAllArgs): Promise<EntityUserSecret[]>
  abstract findAll(selector: "EntityUserSetting", args: FindAllArgs): Promise<EntityUserSetting[]>

  abstract findMany(selector: "EntityUser", args: FindManyArgs): Promise<FindManyResultUser>
  abstract findMany(selector: "EntityUserSecret", args: FindManyArgs): Promise<FindManyResultUserSecret>
  abstract findMany(selector: "EntityUserSetting", args: FindManyArgs): Promise<BaseFindManyRet<EntityUserSetting>>
}

@injectable()
export class UserSourceImpl extends UserSource {
  constructor(@inject("PrismaClient") private prisma: PrismaClient) {
    super()
  }

  async create(args: CreateArgs): Promise<EntityUser> {
    const { data } = args
    try {
      const user = await this.prisma.user.create({
        data,
        select: EntityUser.select,
      })
      return user
    } catch (e) {
      throw this.throwPrismaError(e)
    }
  }

  async update(args: UpdateArgs): Promise<EntityUser> {
    const { data, where } = args
    try {
      const user = await this.prisma.user.update({
        where,
        data,
        select: EntityUser.select,
      })
      return user
    } catch (e) {
      throw this.throwPrismaError(e)
    }
  }

  async upsert(args: UpsertArgs): Promise<EntityUser> {
    const { where, create, update } = args
    try {
      const user = await this.prisma.user.upsert({
        where,
        create,
        update,
        select: EntityUser.select,
      })
      return user
    } catch (e) {
      throw this.throwPrismaError(e)
    }
  }

  async delete(args: DeleteArgs): Promise<void> {
    const { where, physically } = args
    try {
      if (physically) {
        await this.prisma.user.delete({
          where,
        })
      } else {
        await this.prisma.user.update({
          where,
          data: { deletedAt: new Date() },
        })
      }
    } catch (e) {
      throw this.throwPrismaError(e)
    }
  }

  async deleteMany(args: DeleteManyArgs): Promise<void> {
    const { where, physically } = args
    try {
      if (physically) {
        await this.prisma.user.deleteMany({
          where,
        })
      } else {
        await this.prisma.user.updateMany({
          where,
          data: { deletedAt: new Date() },
        })
      }
    } catch (e) {
      throw this.throwPrismaError(e)
    }
  }

  async count(args: FindArgs): Promise<number> {
    const { where } = args
    try {
      const w: Prisma.UserWhereInput = { deletedAt: null, ...where }
      return await this.prisma.user.count({ where: w })
    } catch (e) {
      throw this.throwPrismaError(e)
    }
  }

  async exists(args: FindArgs): Promise<boolean> {
    const { where } = args
    try {
      const w: Prisma.UserWhereInput = { deletedAt: null, ...where }
      const user = await this.prisma.user.findFirst({ where: w, select: { id: true } })
      return user !== null
    } catch (e) {
      throw this.throwPrismaError(e)
    }
  }

  async find(selector: Selector, args: FindArgs): Promise<any> {
    const { where } = args
    try {
      const w: Prisma.UserWhereInput = { deletedAt: null, ...where }
      return await this.prisma.user.findFirstOrThrow({
        where: w,
        select: this.getSelector(selector),
      })
    } catch (e) {
      throw this.throwPrismaError(e)
    }
  }

  async findIfExists(selector: Selector, args: FindArgs): Promise<any> {
    const { where } = args
    try {
      const w: Prisma.UserWhereInput = { deletedAt: null, ...where }
      return await this.prisma.user.findFirst({
        where: w,
        select: this.getSelector(selector),
      })
    } catch (e) {
      throw this.throwPrismaError(e)
    }
  }

  async findAll(selector: Selector, args: FindAllArgs): Promise<any[]> {
    const { where, sortBy, sortDirection } = args
    try {
      const w: Prisma.UserWhereInput = { deletedAt: null, ...where }
      return await this.prisma.user.findMany({
        where: w,
        select: this.getSelector(selector),
        orderBy: this.getSortBy({ sortBy, sortDirection }),
      })
    } catch (e) {
      throw this.throwPrismaError(e)
    }
  }

  async findMany(selector: Selector, args: FindManyArgs): Promise<any> {
    const { where, page, take, sortBy, sortDirection } = args
    try {
      const t = take || this.defaultTake
      const w: Prisma.UserWhereInput = { deletedAt: null, ...where }
      const count = await this.prisma.user.count({ where: w })
      const users = await this.prisma.user.findMany({
        where: w,
        skip: (page ?? 0) * t,
        take: t,
        select: this.getSelector(selector),
        orderBy: this.getSortBy({ sortBy, sortDirection }),
      })
      return { data: users, ...this.getPage({ currentPage: page, count, take: t }) }
    } catch (e) {
      throw this.throwPrismaError(e)
    }
  }

  private getSortBy(sortBy: PageArg<UserSortBy>): Prisma.UserOrderByWithRelationInput {
    const { sortBy: s, sortDirection: d } = sortBy
    const direction = d || "asc"
    switch (s) {
      case "createdAt":
        return { createdAt: direction }
      case "updatedAt":
        return { updatedAt: direction }
      case "email":
        return { email: direction }
      case "name":
        return { name: direction }
      default:
        return { createdAt: direction }
    }
  }
}
