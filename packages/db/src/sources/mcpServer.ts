import { Prisma, PrismaClient } from "@prisma/client"
import { inject, injectable } from "tsyringe"

import { ImplementationError, PageArg } from "@wr/shared"

import { EntityMcpServer, McpServerSortBy } from "../entities/mcpServer"
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

type Selector = "EntityMcpServer"

type CreateArgs = BaseCreateArgs<Prisma.McpServerCreateInput>
type UpdateArgs = BaseUpdateArgs<Prisma.McpServerUpdateInput, Prisma.McpServerWhereUniqueInput>
type UpsertArgs = BaseUpsertArgs<Prisma.McpServerCreateInput, Prisma.McpServerUpdateInput, Prisma.McpServerWhereUniqueInput>
type FindArgs = BaseFindArgs<Prisma.McpServerWhereInput>
type FindAllArgs = BaseFindAllArgs<Prisma.McpServerWhereInput, McpServerSortBy>
type FindManyArgs = BaseFindManyArgs<Prisma.McpServerWhereInput, McpServerSortBy>
type FindManyResult = BaseFindManyRet<EntityMcpServer>
type DeleteArgs = BaseDeleteArgs<Prisma.McpServerWhereUniqueInput>
type DeleteManyArgs = BaseDeleteManyArgs<Prisma.McpServerWhereInput>

export abstract class McpServerSource extends BaseDatabaseSource {
  protected getSelector(selector: Selector) {
    switch (selector) {
      case "EntityMcpServer":
        return EntityMcpServer.select
      default:
        throw new ImplementationError(`Unknown selector: ${selector}`)
    }
  }

  abstract create(args: CreateArgs): Promise<EntityMcpServer>
  abstract update(args: UpdateArgs): Promise<EntityMcpServer>
  abstract upsert(args: UpsertArgs): Promise<EntityMcpServer>
  abstract delete(args: DeleteArgs): Promise<void>
  abstract deleteMany(args: DeleteManyArgs): Promise<void>
  abstract count(args: FindArgs): Promise<number>
  abstract exists(args: FindArgs): Promise<boolean>
  abstract find(selector: "EntityMcpServer", args: FindArgs): Promise<EntityMcpServer>
  abstract findIfExists(selector: "EntityMcpServer", args: FindArgs): Promise<EntityMcpServer | null>
  abstract findAll(selector: "EntityMcpServer", args: FindAllArgs): Promise<EntityMcpServer[]>
  abstract findMany(selector: "EntityMcpServer", args: FindManyArgs): Promise<FindManyResult>
}

@injectable()
export class McpServerSourceImpl extends McpServerSource {
  constructor(@inject("PrismaClient") private prisma: PrismaClient) {
    super()
  }

  async create(args: CreateArgs): Promise<EntityMcpServer> {
    const { data } = args
    try {
      return await this.prisma.mcpServer.create({
        data,
        select: this.getSelector("EntityMcpServer"),
      })
    } catch (e) {
      throw this.throwPrismaError(e)
    }
  }

  async update(args: UpdateArgs): Promise<EntityMcpServer> {
    const { data, where } = args
    try {
      return await this.prisma.mcpServer.update({
        where,
        data,
        select: this.getSelector("EntityMcpServer"),
      })
    } catch (e) {
      throw this.throwPrismaError(e)
    }
  }

  async upsert(args: UpsertArgs): Promise<EntityMcpServer> {
    const { where, create, update } = args
    try {
      return await this.prisma.mcpServer.upsert({
        where,
        create,
        update,
        select: this.getSelector("EntityMcpServer"),
      })
    } catch (e) {
      throw this.throwPrismaError(e)
    }
  }

  async delete(args: DeleteArgs): Promise<void> {
    const { where, physically } = args
    try {
      if (physically) {
        await this.prisma.mcpServer.delete({ where })
      } else {
        await this.prisma.mcpServer.update({
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
        await this.prisma.mcpServer.deleteMany({ where })
      } else {
        await this.prisma.mcpServer.updateMany({
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
      const w: Prisma.McpServerWhereInput = { deletedAt: null, ...where }
      return await this.prisma.mcpServer.count({ where: w })
    } catch (e) {
      throw this.throwPrismaError(e)
    }
  }

  async exists(args: FindArgs): Promise<boolean> {
    const { where } = args
    try {
      const w: Prisma.McpServerWhereInput = { deletedAt: null, ...where }
      const record = await this.prisma.mcpServer.findFirst({ where: w, select: { id: true } })
      return record !== null
    } catch (e) {
      throw this.throwPrismaError(e)
    }
  }

  async find(selector: Selector, args: FindArgs): Promise<EntityMcpServer> {
    const { where } = args
    try {
      const w: Prisma.McpServerWhereInput = { deletedAt: null, ...where }
      return await this.prisma.mcpServer.findFirstOrThrow({
        where: w,
        select: this.getSelector(selector),
      })
    } catch (e) {
      throw this.throwPrismaError(e)
    }
  }

  async findIfExists(selector: Selector, args: FindArgs): Promise<EntityMcpServer | null> {
    const { where } = args
    try {
      const w: Prisma.McpServerWhereInput = { deletedAt: null, ...where }
      return await this.prisma.mcpServer.findFirst({
        where: w,
        select: this.getSelector(selector),
      })
    } catch (e) {
      throw this.throwPrismaError(e)
    }
  }

  async findAll(selector: Selector, args: FindAllArgs): Promise<EntityMcpServer[]> {
    const { where, sortBy, sortDirection } = args
    try {
      const w: Prisma.McpServerWhereInput = { deletedAt: null, ...where }
      return await this.prisma.mcpServer.findMany({
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
      const w: Prisma.McpServerWhereInput = { deletedAt: null, ...where }
      const count = await this.prisma.mcpServer.count({ where: w })
      const records = await this.prisma.mcpServer.findMany({
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

  private getSortBy(sortBy: PageArg<McpServerSortBy>): Prisma.McpServerOrderByWithRelationInput {
    const { sortBy: s, sortDirection: d } = sortBy
    const direction = d || "asc"
    switch (s) {
      case "createdAt":
      case "updatedAt":
      case "name":
        return { [s]: direction }
      default:
        return { createdAt: direction }
    }
  }
}
