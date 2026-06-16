import { Prisma, PrismaClient } from "@prisma/client"
import { inject, injectable } from "tsyringe"

import { ImplementationError, PageArg } from "@wr/shared"

import { EntityTenant, TenantSortBy } from "../entities/tenant"
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

type Selector = "EntityTenant"

type CreateArgs = BaseCreateArgs<Prisma.TenantCreateInput>
type UpdateArgs = BaseUpdateArgs<Prisma.TenantUpdateInput, Prisma.TenantWhereUniqueInput>
type UpsertArgs = BaseUpsertArgs<Prisma.TenantCreateInput, Prisma.TenantUpdateInput, Prisma.TenantWhereUniqueInput>
type FindArgs = BaseFindArgs<Prisma.TenantWhereInput>
type FindAllArgs = BaseFindAllArgs<Prisma.TenantWhereInput, TenantSortBy>
type FindManyArgs = BaseFindManyArgs<Prisma.TenantWhereInput, TenantSortBy>
type FindManyResult = BaseFindManyRet<EntityTenant>
type DeleteArgs = BaseDeleteArgs<Prisma.TenantWhereUniqueInput>
type DeleteManyArgs = BaseDeleteManyArgs<Prisma.TenantWhereInput>

export abstract class TenantSource extends BaseDatabaseSource {
  protected getSelector(selector: Selector) {
    switch (selector) {
      case "EntityTenant":
        return EntityTenant.select
      default:
        throw new ImplementationError(`Unknown selector: ${selector}`)
    }
  }

  abstract create(args: CreateArgs): Promise<EntityTenant>
  abstract update(args: UpdateArgs): Promise<EntityTenant>
  abstract upsert(args: UpsertArgs): Promise<EntityTenant>
  abstract count(args: FindArgs): Promise<number>
  abstract exists(args: FindArgs): Promise<boolean>
  abstract find(selector: "EntityTenant", args: FindArgs): Promise<EntityTenant>
  abstract findIfExists(selector: "EntityTenant", args: FindArgs): Promise<EntityTenant | null>
  abstract findAll(selector: "EntityTenant", args: FindAllArgs): Promise<EntityTenant[]>
  abstract findMany(selector: "EntityTenant", args: FindManyArgs): Promise<FindManyResult>
  abstract delete(args: DeleteArgs): Promise<void>
  abstract deleteMany(args: DeleteManyArgs): Promise<void>
}

@injectable()
export class TenantSourceImpl extends TenantSource {
  constructor(@inject("PrismaClient") private prisma: PrismaClient) {
    super()
  }

  async create(args: CreateArgs) {
    const { data } = args
    try {
      const tenant = await this.prisma.tenant.create({
        data,
        select: this.getSelector("EntityTenant"),
      })
      return tenant
    } catch (e) {
      throw this.throwPrismaError(e)
    }
  }

  async update(args: UpdateArgs) {
    const { data, where } = args
    try {
      const tenant = await this.prisma.tenant.update({
        where,
        data,
        select: this.getSelector("EntityTenant"),
      })
      return tenant
    } catch (e) {
      throw this.throwPrismaError(e)
    }
  }

  async upsert(args: UpsertArgs): Promise<EntityTenant> {
    const { where, create, update } = args
    try {
      const tenant = await this.prisma.tenant.upsert({
        where,
        create,
        update,
        select: this.getSelector("EntityTenant"),
      })
      return tenant
    } catch (e) {
      throw this.throwPrismaError(e)
    }
  }

  async count(args: FindArgs): Promise<number> {
    const { where } = args
    try {
      const w: Prisma.TenantWhereInput = { deletedAt: null, ...where }
      return await this.prisma.tenant.count({ where: w })
    } catch (e) {
      throw this.throwPrismaError(e)
    }
  }

  async exists(args: FindArgs): Promise<boolean> {
    const { where } = args
    try {
      const w: Prisma.TenantWhereInput = { deletedAt: null, ...where }
      const tenant = await this.prisma.tenant.findFirst({ where: w, select: { id: true } })
      return tenant !== null
    } catch (e) {
      throw this.throwPrismaError(e)
    }
  }

  async find(selector: "EntityTenant", args: FindArgs) {
    const { where } = args
    try {
      const w: Prisma.TenantWhereInput = { deletedAt: null, ...where }
      return await this.prisma.tenant.findFirstOrThrow({
        where: w,
        select: this.getSelector(selector),
      })
    } catch (e) {
      throw this.throwPrismaError(e)
    }
  }

  async findIfExists(selector: "EntityTenant", args: FindArgs) {
    const { where } = args
    try {
      const w: Prisma.TenantWhereInput = { deletedAt: null, ...where }
      return await this.prisma.tenant.findFirst({
        where: w,
        select: this.getSelector(selector),
      })
    } catch (e) {
      throw this.throwPrismaError(e)
    }
  }

  async findAll(selector: "EntityTenant", args: FindAllArgs) {
    const { where, sortBy, sortDirection } = args
    try {
      const w: Prisma.TenantWhereInput = { deletedAt: null, ...where }
      return await this.prisma.tenant.findMany({
        where: w,
        select: this.getSelector(selector),
        orderBy: this.getSortBy({ sortBy, sortDirection }),
      })
    } catch (e) {
      throw this.throwPrismaError(e)
    }
  }

  async findMany(selector: "EntityTenant", args: FindManyArgs): Promise<FindManyResult> {
    const { where, page, take, sortBy, sortDirection } = args
    try {
      const t = take || this.defaultTake
      const w: Prisma.TenantWhereInput = { deletedAt: null, ...where }
      const count = await this.prisma.tenant.count({ where: w })
      const tenants = await this.prisma.tenant.findMany({
        where: w,
        skip: (page ?? 0) * t,
        take: t,
        select: this.getSelector(selector),
        orderBy: this.getSortBy({ sortBy, sortDirection }),
      })
      return { data: tenants, ...this.getPage({ currentPage: page, count, take: t }) }
    } catch (e) {
      throw this.throwPrismaError(e)
    }
  }

  private getSortBy(sortBy: PageArg<TenantSortBy>): Prisma.TenantOrderByWithRelationInput {
    const { sortBy: s, sortDirection: d } = sortBy
    const direction = d || "asc"
    switch (s) {
      case "name":
        return { name: direction }
      case "id":
      default:
        return { id: direction }
    }
  }

  async delete(args: DeleteArgs): Promise<void> {
    const { where, physically } = args
    try {
      if (physically) {
        await this.prisma.tenant.delete({
          where,
        })
      } else {
        await this.prisma.tenant.update({
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
        await this.prisma.tenant.deleteMany({
          where,
        })
      } else {
        await this.prisma.tenant.updateMany({
          where,
          data: { deletedAt: new Date() },
        })
      }
    } catch (e) {
      throw this.throwPrismaError(e)
    }
  }
}
