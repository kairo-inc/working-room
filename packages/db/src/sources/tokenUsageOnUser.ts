import { Prisma, PrismaClient } from "@prisma/client"
import { inject, injectable } from "tsyringe"

import { ImplementationError, PageArg } from "@wr/shared"

import { EntityTokenUsageOnUser, TokenUsageOnUserSortBy } from "../entities/tokenUsageOnUser"
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

type Selector = "EntityTokenUsageOnUser"

type CreateArgs = BaseCreateArgs<never>
type UpdateArgs = BaseUpdateArgs<never, never>
type UpsertArgs = BaseUpsertArgs<never, never, never>
type FindArgs = BaseFindArgs<Prisma.TokenUsageOnUserWhereInput>
type FindAllArgs = BaseFindAllArgs<Prisma.TokenUsageOnUserWhereInput, TokenUsageOnUserSortBy>
type FindManyArgs = BaseFindManyArgs<Prisma.TokenUsageOnUserWhereInput, TokenUsageOnUserSortBy>
type FindManyResult = BaseFindManyRet<EntityTokenUsageOnUser>
type DeleteArgs = BaseDeleteArgs<never>
type DeleteManyArgs = BaseDeleteManyArgs<never>

export abstract class TokenUsageOnUserSource extends BaseDatabaseSource {
  protected getSelector(selector: Selector) {
    switch (selector) {
      case "EntityTokenUsageOnUser":
        return EntityTokenUsageOnUser.select
      default:
        throw new ImplementationError(`Unknown selector: ${selector}`)
    }
  }

  abstract create(args: CreateArgs): Promise<EntityTokenUsageOnUser>
  abstract update(args: UpdateArgs): Promise<EntityTokenUsageOnUser>
  abstract upsert(args: UpsertArgs): Promise<EntityTokenUsageOnUser>
  abstract delete(args: DeleteArgs): Promise<void>
  abstract deleteMany(args: DeleteManyArgs): Promise<void>
  abstract count(args: FindArgs): Promise<number>
  abstract exists(args: FindArgs): Promise<boolean>
  abstract find(selector: "EntityTokenUsageOnUser", args: FindArgs): Promise<EntityTokenUsageOnUser>
  abstract findIfExists(selector: "EntityTokenUsageOnUser", args: FindArgs): Promise<EntityTokenUsageOnUser | null>
  abstract findAll(selector: "EntityTokenUsageOnUser", args: FindAllArgs): Promise<EntityTokenUsageOnUser[]>
  abstract findMany(selector: "EntityTokenUsageOnUser", args: FindManyArgs): Promise<FindManyResult>
}

@injectable()
export class TokenUsageOnUserSourceImpl extends TokenUsageOnUserSource {
  constructor(@inject("PrismaClient") private prisma: PrismaClient) {
    super()
  }

  async create(): Promise<EntityTokenUsageOnUser> {
    throw new ImplementationError("TokenUsageOnUser is read-only")
  }

  async update(): Promise<EntityTokenUsageOnUser> {
    throw new ImplementationError("TokenUsageOnUser is read-only")
  }

  async upsert(): Promise<EntityTokenUsageOnUser> {
    throw new ImplementationError("TokenUsageOnUser is read-only")
  }

  async delete(): Promise<void> {
    throw new ImplementationError("TokenUsageOnUser is read-only")
  }

  async deleteMany(): Promise<void> {
    throw new ImplementationError("TokenUsageOnUser is read-only")
  }

  async count(args: FindArgs): Promise<number> {
    const { where } = args
    try {
      return await this.prisma.tokenUsageOnUser.count({ where })
    } catch (e) {
      throw this.throwPrismaError(e)
    }
  }

  async exists(args: FindArgs): Promise<boolean> {
    const { where } = args
    try {
      const tokenUsage = await this.prisma.tokenUsageOnUser.findFirst({ where, select: { userId: true } })
      return tokenUsage !== null
    } catch (e) {
      throw this.throwPrismaError(e)
    }
  }

  async find(selector: Selector, args: FindArgs): Promise<EntityTokenUsageOnUser> {
    const { where } = args
    try {
      return await this.prisma.tokenUsageOnUser.findFirstOrThrow({
        where,
        select: this.getSelector(selector),
      })
    } catch (e) {
      throw this.throwPrismaError(e)
    }
  }

  async findIfExists(selector: Selector, args: FindArgs): Promise<EntityTokenUsageOnUser | null> {
    const { where } = args
    try {
      return await this.prisma.tokenUsageOnUser.findFirst({
        where,
        select: this.getSelector(selector),
      })
    } catch (e) {
      throw this.throwPrismaError(e)
    }
  }

  async findAll(selector: Selector, args: FindAllArgs): Promise<EntityTokenUsageOnUser[]> {
    const { where, sortBy, sortDirection } = args
    try {
      return await this.prisma.tokenUsageOnUser.findMany({
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
      const count = await this.prisma.tokenUsageOnUser.count({ where })
      const tokenUsages = await this.prisma.tokenUsageOnUser.findMany({
        where,
        skip: (page ?? 0) * t,
        take: t,
        select: this.getSelector(selector),
        orderBy: this.getSortBy({ sortBy, sortDirection }),
      })
      return { data: tokenUsages, ...this.getPage({ currentPage: page, count, take: t }) }
    } catch (e) {
      throw this.throwPrismaError(e)
    }
  }

  private getSortBy(sortBy: PageArg<TokenUsageOnUserSortBy>): Prisma.TokenUsageOnUserOrderByWithRelationInput {
    const { sortBy: s, sortDirection: d } = sortBy
    const direction = d || "asc"
    switch (s) {
      case "createdAt":
      case "userId":
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
