import { Prisma, PrismaClient } from "@prisma/client"
import { inject, injectable } from "tsyringe"

import { ImplementationError, PageArg } from "@wr/shared"

import { AccessGroupSortBy, EntityAccessGroup } from "../entities/accessGroup"
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

type Selector = "EntityAccessGroup"

type CreateArgs = BaseCreateArgs<Prisma.AccessGroupCreateInput>
type UpdateArgs = BaseUpdateArgs<Prisma.AccessGroupUpdateInput, Prisma.AccessGroupWhereUniqueInput>
type UpsertArgs = BaseUpsertArgs<Prisma.AccessGroupCreateInput, Prisma.AccessGroupUpdateInput, Prisma.AccessGroupWhereUniqueInput>
type FindArgs = BaseFindArgs<Prisma.AccessGroupWhereInput>
type FindAllArgs = BaseFindAllArgs<Prisma.AccessGroupWhereInput, AccessGroupSortBy>
type FindManyArgs = BaseFindManyArgs<Prisma.AccessGroupWhereInput, AccessGroupSortBy>
type FindManyResult = BaseFindManyRet<EntityAccessGroup>
type DeleteArgs = BaseDeleteArgs<Prisma.AccessGroupWhereUniqueInput>
type DeleteManyArgs = BaseDeleteManyArgs<Prisma.AccessGroupWhereInput>

export abstract class AccessGroupSource extends BaseDatabaseSource {
  protected getSelector(selector: Selector) {
    switch (selector) {
      case "EntityAccessGroup":
        return EntityAccessGroup.select
      default:
        throw new ImplementationError(`Unknown selector: ${selector}`)
    }
  }

  abstract create(args: CreateArgs): Promise<EntityAccessGroup>
  abstract update(args: UpdateArgs): Promise<EntityAccessGroup>
  abstract upsert(args: UpsertArgs): Promise<EntityAccessGroup>
  abstract delete(args: DeleteArgs): Promise<void>
  abstract deleteMany(args: DeleteManyArgs): Promise<void>
  abstract count(args: FindArgs): Promise<number>
  abstract exists(args: FindArgs): Promise<boolean>

  abstract find(selector: "EntityAccessGroup", args: FindArgs): Promise<EntityAccessGroup>
  abstract findIfExists(selector: "EntityAccessGroup", args: FindArgs): Promise<EntityAccessGroup | null>
  abstract findAll(selector: "EntityAccessGroup", args: FindAllArgs): Promise<EntityAccessGroup[]>
  abstract findMany(selector: "EntityAccessGroup", args: FindManyArgs): Promise<FindManyResult>
}

@injectable()
export class AccessGroupSourceImpl extends AccessGroupSource {
  constructor(@inject("PrismaClient") private prisma: PrismaClient) {
    super()
  }

  async create(args: CreateArgs): Promise<EntityAccessGroup> {
    const { data } = args
    try {
      const accessGroup = await this.prisma.accessGroup.create({
        data,
        select: this.getSelector("EntityAccessGroup"),
      })
      return accessGroup
    } catch (e) {
      throw this.throwPrismaError(e)
    }
  }

  async update(args: UpdateArgs): Promise<EntityAccessGroup> {
    const { data, where } = args
    try {
      const accessGroup = await this.prisma.accessGroup.update({
        where,
        data,
        select: this.getSelector("EntityAccessGroup"),
      })
      return accessGroup
    } catch (e) {
      throw this.throwPrismaError(e)
    }
  }

  async upsert(args: UpsertArgs): Promise<EntityAccessGroup> {
    const { where, create, update } = args
    try {
      const accessGroup = await this.prisma.accessGroup.upsert({
        where,
        create,
        update,
        select: this.getSelector("EntityAccessGroup"),
      })
      return accessGroup
    } catch (e) {
      throw this.throwPrismaError(e)
    }
  }

  async delete(args: DeleteArgs): Promise<void> {
    const { where, physically } = args
    try {
      if (physically) {
        await this.prisma.accessGroup.delete({
          where,
        })
      } else {
        await this.prisma.accessGroup.update({
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
        await this.prisma.accessGroup.deleteMany({
          where,
        })
      } else {
        await this.prisma.accessGroup.updateMany({
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
      const w: Prisma.AccessGroupWhereInput = { deletedAt: null, ...where }
      return await this.prisma.accessGroup.count({ where: w })
    } catch (e) {
      throw this.throwPrismaError(e)
    }
  }

  async exists(args: FindArgs): Promise<boolean> {
    const { where } = args
    try {
      const w: Prisma.AccessGroupWhereInput = { deletedAt: null, ...where }
      const accessGroup = await this.prisma.accessGroup.findFirst({ where: w, select: { id: true } })
      return accessGroup !== null
    } catch (e) {
      throw this.throwPrismaError(e)
    }
  }

  async find(selector: Selector, args: FindArgs): Promise<EntityAccessGroup> {
    const { where } = args
    try {
      const w: Prisma.AccessGroupWhereInput = { deletedAt: null, ...where }
      return await this.prisma.accessGroup.findFirstOrThrow({
        where: w,
        select: this.getSelector(selector),
      })
    } catch (e) {
      throw this.throwPrismaError(e)
    }
  }

  async findIfExists(selector: Selector, args: FindArgs): Promise<EntityAccessGroup | null> {
    const { where } = args
    try {
      const w: Prisma.AccessGroupWhereInput = { deletedAt: null, ...where }
      return await this.prisma.accessGroup.findFirst({
        where: w,
        select: this.getSelector(selector),
      })
    } catch (e) {
      throw this.throwPrismaError(e)
    }
  }

  async findAll(selector: Selector, args: FindAllArgs): Promise<EntityAccessGroup[]> {
    const { where, sortBy, sortDirection } = args
    try {
      const w: Prisma.AccessGroupWhereInput = { deletedAt: null, ...where }
      return await this.prisma.accessGroup.findMany({
        where: w,
        select: this.getSelector(selector),
        orderBy: this.getSortBy({ sortBy, sortDirection }),
      })
    } catch (e) {
      throw this.throwPrismaError(e)
    }
  }

  async findMany(selector: Selector, args: FindManyArgs): Promise<FindManyResult> {
    const { where, page, take, sortBy, sortDirection } = args
    try {
      const t = take || this.defaultTake
      const w: Prisma.AccessGroupWhereInput = { deletedAt: null, ...where }
      const count = await this.prisma.accessGroup.count({ where: w })
      const policies = await this.prisma.accessGroup.findMany({
        where: w,
        skip: (page ?? 0) * t,
        take: t,
        select: this.getSelector(selector),
        orderBy: this.getSortBy({ sortBy, sortDirection }),
      })
      return { data: policies, ...this.getPage({ currentPage: page, count, take: t }) }
    } catch (e) {
      throw this.throwPrismaError(e)
    }
  }

  private getSortBy(sortBy: PageArg<AccessGroupSortBy>): Prisma.AccessGroupOrderByWithRelationInput {
    const { sortBy: s, sortDirection: d } = sortBy
    const direction = d || "asc"
    switch (s) {
      case "name":
        return { name: direction }
      case "createdAt":
        return { createdAt: direction }
      case "updatedAt":
        return { updatedAt: direction }
      case "id":
      default:
        return { id: direction }
    }
  }
}
