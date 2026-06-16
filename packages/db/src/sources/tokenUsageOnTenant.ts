import { Prisma, PrismaClient } from "@prisma/client"
import { inject, injectable } from "tsyringe"

import { ImplementationError, PageArg } from "@wr/shared"

import { EntityTokenUsageOnTenant, TokenUsageOnTenantSortBy } from "../entities/tokenUsageOnTenant"
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

type Selector = "EntityTokenUsageOnTenant"

type CreateArgs = BaseCreateArgs<never>
type UpdateArgs = BaseUpdateArgs<never, never>
type UpsertArgs = BaseUpsertArgs<never, never, never>
type FindArgs = BaseFindArgs<Prisma.TokenUsageOnTenantWhereInput>
type FindAllArgs = BaseFindAllArgs<Prisma.TokenUsageOnTenantWhereInput, TokenUsageOnTenantSortBy>
type FindManyArgs = BaseFindManyArgs<Prisma.TokenUsageOnTenantWhereInput, TokenUsageOnTenantSortBy>
type FindManyResult = BaseFindManyRet<EntityTokenUsageOnTenant>
type DeleteArgs = BaseDeleteArgs<never>
type DeleteManyArgs = BaseDeleteManyArgs<never>

export abstract class TokenUsageOnTenantSource extends BaseDatabaseSource {
  protected getSelector(selector: Selector) {
    switch (selector) {
      case "EntityTokenUsageOnTenant":
        return EntityTokenUsageOnTenant.select
      default:
        throw new ImplementationError(`Unknown selector: ${selector}`)
    }
  }

  abstract create(args: CreateArgs): Promise<EntityTokenUsageOnTenant>
  abstract update(args: UpdateArgs): Promise<EntityTokenUsageOnTenant>
  abstract upsert(args: UpsertArgs): Promise<EntityTokenUsageOnTenant>
  abstract delete(args: DeleteArgs): Promise<void>
  abstract deleteMany(args: DeleteManyArgs): Promise<void>
  abstract count(args: FindArgs): Promise<number>
  abstract exists(args: FindArgs): Promise<boolean>
  abstract find(selector: "EntityTokenUsageOnTenant", args: FindArgs): Promise<EntityTokenUsageOnTenant>
  abstract findIfExists(selector: "EntityTokenUsageOnTenant", args: FindArgs): Promise<EntityTokenUsageOnTenant | null>
  abstract findAll(selector: "EntityTokenUsageOnTenant", args: FindAllArgs): Promise<EntityTokenUsageOnTenant[]>
  abstract findMany(selector: "EntityTokenUsageOnTenant", args: FindManyArgs): Promise<FindManyResult>
}

@injectable()
export class TokenUsageOnTenantSourceImpl extends TokenUsageOnTenantSource {
  constructor(@inject("PrismaClient") private prisma: PrismaClient) {
    super()
  }

  async create(): Promise<EntityTokenUsageOnTenant> {
    throw new ImplementationError("TokenUsageOnTenant is read-only")
  }

  async update(): Promise<EntityTokenUsageOnTenant> {
    throw new ImplementationError("TokenUsageOnTenant is read-only")
  }

  async upsert(): Promise<EntityTokenUsageOnTenant> {
    throw new ImplementationError("TokenUsageOnTenant is read-only")
  }

  async delete(): Promise<void> {
    throw new ImplementationError("TokenUsageOnTenant is read-only")
  }

  async deleteMany(): Promise<void> {
    throw new ImplementationError("TokenUsageOnTenant is read-only")
  }

  async count(args: FindArgs): Promise<number> {
    const { where } = args
    try {
      return await this.prisma.tokenUsageOnTenant.count({ where })
    } catch (e) {
      throw this.throwPrismaError(e)
    }
  }

  async exists(args: FindArgs): Promise<boolean> {
    const { where } = args
    try {
      const tokenUsage = await this.prisma.tokenUsageOnTenant.findFirst({ where, select: { tenantId: true } })
      return tokenUsage !== null
    } catch (e) {
      throw this.throwPrismaError(e)
    }
  }

  async find(selector: Selector, args: FindArgs): Promise<EntityTokenUsageOnTenant> {
    const { where } = args
    try {
      return await this.prisma.tokenUsageOnTenant.findFirstOrThrow({
        where,
        select: this.getSelector(selector),
      })
    } catch (e) {
      throw this.throwPrismaError(e)
    }
  }

  async findIfExists(selector: Selector, args: FindArgs): Promise<EntityTokenUsageOnTenant | null> {
    const { where } = args
    try {
      return await this.prisma.tokenUsageOnTenant.findFirst({
        where,
        select: this.getSelector(selector),
      })
    } catch (e) {
      throw this.throwPrismaError(e)
    }
  }

  async findAll(selector: Selector, args: FindAllArgs): Promise<EntityTokenUsageOnTenant[]> {
    const { where, sortBy, sortDirection } = args
    try {
      return await this.prisma.tokenUsageOnTenant.findMany({
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
      const count = await this.prisma.tokenUsageOnTenant.count({ where })
      const tokenUsages = await this.prisma.tokenUsageOnTenant.findMany({
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

  private getSortBy(sortBy: PageArg<TokenUsageOnTenantSortBy>): Prisma.TokenUsageOnTenantOrderByWithRelationInput {
    const { sortBy: s, sortDirection: d } = sortBy
    const direction = d || "asc"
    switch (s) {
      case "createdAt":
      case "tenantId":
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
