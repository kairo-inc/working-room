import { Prisma, PrismaClient } from "@prisma/client"
import { inject, injectable } from "tsyringe"

import { ImplementationError, PageArg } from "@wr/shared"

import { EntityOauthClientSlack, OauthClientSlackSortBy } from "../entities/oauthClientSlack"
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

type Selector = "EntityOauthClientSlack"

type CreateArgs = BaseCreateArgs<Prisma.OauthClientSlackCreateInput>
type UpdateArgs = BaseUpdateArgs<Prisma.OauthClientSlackUpdateInput, Prisma.OauthClientSlackWhereUniqueInput>
type UpsertArgs = BaseUpsertArgs<
  Prisma.OauthClientSlackCreateInput,
  Prisma.OauthClientSlackUpdateInput,
  Prisma.OauthClientSlackWhereUniqueInput
>
type FindArgs = BaseFindArgs<Prisma.OauthClientSlackWhereInput>
type FindAllArgs = BaseFindAllArgs<Prisma.OauthClientSlackWhereInput, OauthClientSlackSortBy>
type FindManyArgs = BaseFindManyArgs<Prisma.OauthClientSlackWhereInput, OauthClientSlackSortBy>
type FindManyResult = BaseFindManyRet<EntityOauthClientSlack>
type DeleteArgs = BaseDeleteArgs<Prisma.OauthClientSlackWhereUniqueInput>
type DeleteManyArgs = BaseDeleteManyArgs<Prisma.OauthClientSlackWhereInput>

export abstract class OauthClientSlackSource extends BaseDatabaseSource {
  protected getSelector(selector: Selector) {
    switch (selector) {
      case "EntityOauthClientSlack":
        return EntityOauthClientSlack.select
      default:
        throw new ImplementationError(`Unknown selector: ${selector}`)
    }
  }

  abstract create(args: CreateArgs): Promise<EntityOauthClientSlack>
  abstract update(args: UpdateArgs): Promise<EntityOauthClientSlack>
  abstract upsert(args: UpsertArgs): Promise<EntityOauthClientSlack>
  abstract delete(args: DeleteArgs): Promise<void>
  abstract deleteMany(args: DeleteManyArgs): Promise<void>
  abstract count(args: FindArgs): Promise<number>
  abstract exists(args: FindArgs): Promise<boolean>
  abstract find(selector: "EntityOauthClientSlack", args: FindArgs): Promise<EntityOauthClientSlack>
  abstract findIfExists(selector: "EntityOauthClientSlack", args: FindArgs): Promise<EntityOauthClientSlack | null>
  abstract findAll(selector: "EntityOauthClientSlack", args: FindAllArgs): Promise<EntityOauthClientSlack[]>
  abstract findMany(selector: "EntityOauthClientSlack", args: FindManyArgs): Promise<FindManyResult>
}

@injectable()
export class OauthClientSlackSourceImpl extends OauthClientSlackSource {
  constructor(@inject("PrismaClient") private prisma: PrismaClient) {
    super()
  }

  async create(args: CreateArgs): Promise<EntityOauthClientSlack> {
    const { data } = args
    try {
      return await this.prisma.oauthClientSlack.create({
        data,
        select: this.getSelector("EntityOauthClientSlack"),
      })
    } catch (e) {
      throw this.throwPrismaError(e)
    }
  }

  async update(args: UpdateArgs): Promise<EntityOauthClientSlack> {
    const { data, where } = args
    try {
      return await this.prisma.oauthClientSlack.update({
        where,
        data,
        select: this.getSelector("EntityOauthClientSlack"),
      })
    } catch (e) {
      throw this.throwPrismaError(e)
    }
  }

  async upsert(args: UpsertArgs): Promise<EntityOauthClientSlack> {
    const { where, create, update } = args
    try {
      return await this.prisma.oauthClientSlack.upsert({
        where,
        create,
        update,
        select: this.getSelector("EntityOauthClientSlack"),
      })
    } catch (e) {
      throw this.throwPrismaError(e)
    }
  }

  async delete(args: DeleteArgs): Promise<void> {
    const { where, physically } = args
    try {
      if (physically) {
        await this.prisma.oauthClientSlack.delete({ where })
      } else {
        await this.prisma.oauthClientSlack.update({
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
        await this.prisma.oauthClientSlack.deleteMany({ where })
      } else {
        await this.prisma.oauthClientSlack.updateMany({
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
      const w: Prisma.OauthClientSlackWhereInput = { deletedAt: null, ...where }
      return await this.prisma.oauthClientSlack.count({ where: w })
    } catch (e) {
      throw this.throwPrismaError(e)
    }
  }

  async exists(args: FindArgs): Promise<boolean> {
    const { where } = args
    try {
      const w: Prisma.OauthClientSlackWhereInput = { deletedAt: null, ...where }
      const record = await this.prisma.oauthClientSlack.findFirst({ where: w, select: { id: true } })
      return record !== null
    } catch (e) {
      throw this.throwPrismaError(e)
    }
  }

  async find(selector: Selector, args: FindArgs): Promise<EntityOauthClientSlack> {
    const { where } = args
    try {
      const w: Prisma.OauthClientSlackWhereInput = { deletedAt: null, ...where }
      return await this.prisma.oauthClientSlack.findFirstOrThrow({
        where: w,
        select: this.getSelector(selector),
      })
    } catch (e) {
      throw this.throwPrismaError(e)
    }
  }

  async findIfExists(selector: Selector, args: FindArgs): Promise<EntityOauthClientSlack | null> {
    const { where } = args
    try {
      const w: Prisma.OauthClientSlackWhereInput = { deletedAt: null, ...where }
      return await this.prisma.oauthClientSlack.findFirst({
        where: w,
        select: this.getSelector(selector),
      })
    } catch (e) {
      throw this.throwPrismaError(e)
    }
  }

  async findAll(selector: Selector, args: FindAllArgs): Promise<EntityOauthClientSlack[]> {
    const { where, sortBy, sortDirection } = args
    try {
      const w: Prisma.OauthClientSlackWhereInput = { deletedAt: null, ...where }
      return await this.prisma.oauthClientSlack.findMany({
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
      const w: Prisma.OauthClientSlackWhereInput = { deletedAt: null, ...where }
      const count = await this.prisma.oauthClientSlack.count({ where: w })
      const records = await this.prisma.oauthClientSlack.findMany({
        where: w,
        skip: (page ?? 0) * t,
        take: t,
        select: this.getSelector(selector),
        orderBy: this.getSortBy({ sortBy, sortDirection }),
      })
      return { data: records, ...this.getPage({ currentPage: page, count, take: t }) }
    } catch (e) {
      throw this.throwPrismaError(e)
    }
  }

  private getSortBy(sortBy: PageArg<OauthClientSlackSortBy>): Prisma.OauthClientSlackOrderByWithRelationInput {
    const { sortBy: s, sortDirection: d } = sortBy
    const direction = d || "asc"
    switch (s) {
      case "createdAt":
      case "updatedAt":
      case "slackTeamName":
        return { [s]: direction }
      default:
        return { createdAt: direction }
    }
  }
}
