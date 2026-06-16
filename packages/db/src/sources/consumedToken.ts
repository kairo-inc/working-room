import { Prisma, PrismaClient } from "@prisma/client"
import { inject, injectable } from "tsyringe"

import { ImplementationError, PageArg } from "@wr/shared"

import { ConsumedTokenSortBy, EntityConsumedToken } from "../entities/consumedToken"
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

type Selector = "EntityConsumedToken"

type CreateArgs = BaseCreateArgs<Prisma.ConsumedTokenCreateInput>
type UpdateArgs = BaseUpdateArgs<Prisma.ConsumedTokenUpdateInput, Prisma.ConsumedTokenWhereUniqueInput>
type UpsertArgs = BaseUpsertArgs<Prisma.ConsumedTokenCreateInput, Prisma.ConsumedTokenUpdateInput, Prisma.ConsumedTokenWhereUniqueInput>
type FindArgs = BaseFindArgs<Prisma.ConsumedTokenWhereInput>
type FindAllArgs = BaseFindAllArgs<Prisma.ConsumedTokenWhereInput, ConsumedTokenSortBy>
type FindManyArgs = BaseFindManyArgs<Prisma.ConsumedTokenWhereInput, ConsumedTokenSortBy>
type FindManyResult = BaseFindManyRet<EntityConsumedToken>
type DeleteArgs = BaseDeleteArgs<Prisma.ConsumedTokenWhereUniqueInput>
type DeleteManyArgs = BaseDeleteManyArgs<Prisma.ConsumedTokenWhereInput>

export abstract class ConsumedTokenSource extends BaseDatabaseSource {
  protected getSelector(selector: Selector) {
    switch (selector) {
      case "EntityConsumedToken":
        return EntityConsumedToken.select
      default:
        throw new ImplementationError(`Unknown selector: ${selector}`)
    }
  }

  abstract create(args: CreateArgs): Promise<EntityConsumedToken>
  abstract update(args: UpdateArgs): Promise<EntityConsumedToken>
  abstract upsert(args: UpsertArgs): Promise<EntityConsumedToken>
  abstract delete(args: DeleteArgs): Promise<void>
  abstract deleteMany(args: DeleteManyArgs): Promise<void>
  abstract count(args: FindArgs): Promise<number>
  abstract exists(args: FindArgs): Promise<boolean>
  abstract find(selector: "EntityConsumedToken", args: FindArgs): Promise<EntityConsumedToken>
  abstract findIfExists(selector: "EntityConsumedToken", args: FindArgs): Promise<EntityConsumedToken | null>
  abstract findAll(selector: "EntityConsumedToken", args: FindAllArgs): Promise<EntityConsumedToken[]>
  abstract findMany(selector: "EntityConsumedToken", args: FindManyArgs): Promise<FindManyResult>
}

@injectable()
export class ConsumedTokenSourceImpl extends ConsumedTokenSource {
  constructor(@inject("PrismaClient") private prisma: PrismaClient) {
    super()
  }

  async create(args: CreateArgs): Promise<EntityConsumedToken> {
    const { data } = args
    try {
      const consumedToken = await this.prisma.consumedToken.create({
        data,
        select: this.getSelector("EntityConsumedToken"),
      })
      return consumedToken
    } catch (e) {
      throw this.throwPrismaError(e)
    }
  }

  async update(args: UpdateArgs): Promise<EntityConsumedToken> {
    const { data, where } = args
    try {
      const consumedToken = await this.prisma.consumedToken.update({
        where,
        data,
        select: this.getSelector("EntityConsumedToken"),
      })
      return consumedToken
    } catch (e) {
      throw this.throwPrismaError(e)
    }
  }

  async upsert(args: UpsertArgs): Promise<EntityConsumedToken> {
    const { where, create, update } = args
    try {
      const consumedToken = await this.prisma.consumedToken.upsert({
        where,
        create,
        update,
        select: this.getSelector("EntityConsumedToken"),
      })
      return consumedToken
    } catch (e) {
      throw this.throwPrismaError(e)
    }
  }

  async delete(args: DeleteArgs): Promise<void> {
    const { where } = args
    try {
      await this.prisma.consumedToken.delete({
        where,
      })
    } catch (e) {
      throw this.throwPrismaError(e)
    }
  }

  async deleteMany(args: DeleteManyArgs): Promise<void> {
    const { where } = args
    try {
      await this.prisma.consumedToken.deleteMany({
        where,
      })
    } catch (e) {
      throw this.throwPrismaError(e)
    }
  }

  async count(args: FindArgs): Promise<number> {
    const { where } = args
    try {
      return await this.prisma.consumedToken.count({ where })
    } catch (e) {
      throw this.throwPrismaError(e)
    }
  }

  async exists(args: FindArgs): Promise<boolean> {
    const { where } = args
    try {
      const consumedToken = await this.prisma.consumedToken.findFirst({ where, select: { id: true } })
      return consumedToken !== null
    } catch (e) {
      throw this.throwPrismaError(e)
    }
  }

  async find(selector: Selector, args: FindArgs): Promise<EntityConsumedToken> {
    const { where } = args
    try {
      return await this.prisma.consumedToken.findFirstOrThrow({
        where,
        select: this.getSelector(selector),
      })
    } catch (e) {
      throw this.throwPrismaError(e)
    }
  }

  async findIfExists(selector: Selector, args: FindArgs): Promise<EntityConsumedToken | null> {
    const { where } = args
    try {
      return await this.prisma.consumedToken.findFirst({
        where,
        select: this.getSelector(selector),
      })
    } catch (e) {
      throw this.throwPrismaError(e)
    }
  }

  async findAll(selector: Selector, args: FindAllArgs): Promise<EntityConsumedToken[]> {
    const { where, sortBy, sortDirection } = args
    try {
      return await this.prisma.consumedToken.findMany({
        where,
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
      const count = await this.prisma.consumedToken.count({ where })
      const consumedTokens = await this.prisma.consumedToken.findMany({
        where,
        skip: (page ?? 0) * t,
        take: t,
        select: this.getSelector(selector),
        orderBy: this.getSortBy({ sortBy, sortDirection }),
      })
      return { data: consumedTokens, ...this.getPage({ currentPage: page, count, take: t }) }
    } catch (e) {
      throw this.throwPrismaError(e)
    }
  }

  private getSortBy(sortBy: PageArg<ConsumedTokenSortBy>): Prisma.ConsumedTokenOrderByWithRelationInput {
    const { sortBy: s, sortDirection: d } = sortBy
    const direction = d || "asc"
    switch (s) {
      case "createdAt":
      case "provider":
      case "model":
      case "inputTokens":
      case "outputTokens":
      case "noCacheInputTokens":
      case "cachedInputTokens":
        return { [s]: direction }
      default:
        return { createdAt: direction }
    }
  }
}
