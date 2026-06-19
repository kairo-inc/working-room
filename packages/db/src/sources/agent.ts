import { Prisma, PrismaClient } from "@prisma/client"
import { inject, injectable } from "tsyringe"

import { ImplementationError, PageArg } from "@wr/shared"

import { AgentSortBy, EntityAgent } from "../entities/agent"
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

type Selector = "EntityAgent"

type CreateArgs = BaseCreateArgs<Prisma.AgentCreateInput>
type UpdateArgs = BaseUpdateArgs<Prisma.AgentUpdateInput, Prisma.AgentWhereUniqueInput>
type UpsertArgs = BaseUpsertArgs<Prisma.AgentCreateInput, Prisma.AgentUpdateInput, Prisma.AgentWhereUniqueInput>
type FindArgs = BaseFindArgs<Prisma.AgentWhereInput>
type FindAllArgs = BaseFindAllArgs<Prisma.AgentWhereInput, AgentSortBy>
type FindManyArgs = BaseFindManyArgs<Prisma.AgentWhereInput, AgentSortBy>
type FindManyResult = BaseFindManyRet<EntityAgent>
type DeleteArgs = BaseDeleteArgs<Prisma.AgentWhereUniqueInput>
type DeleteManyArgs = BaseDeleteManyArgs<Prisma.AgentWhereInput>

export abstract class AgentSource extends BaseDatabaseSource {
  protected getSelector(selector: Selector) {
    switch (selector) {
      case "EntityAgent":
        return EntityAgent.select
      default:
        throw new ImplementationError(`Unknown selector: ${selector}`)
    }
  }

  abstract create(args: CreateArgs): Promise<EntityAgent>
  abstract update(args: UpdateArgs): Promise<EntityAgent>
  abstract upsert(args: UpsertArgs): Promise<EntityAgent>
  abstract delete(args: DeleteArgs): Promise<void>
  abstract deleteMany(args: DeleteManyArgs): Promise<void>
  abstract count(args: FindArgs): Promise<number>
  abstract exists(args: FindArgs): Promise<boolean>
  abstract find(selector: "EntityAgent", args: FindArgs): Promise<EntityAgent>
  abstract findIfExists(selector: "EntityAgent", args: FindArgs): Promise<EntityAgent | null>
  abstract findAll(selector: "EntityAgent", args: FindAllArgs): Promise<EntityAgent[]>
  abstract findMany(selector: "EntityAgent", args: FindManyArgs): Promise<FindManyResult>
}

@injectable()
export class AgentSourceImpl extends AgentSource {
  constructor(@inject("PrismaClient") private prisma: PrismaClient) {
    super()
  }

  async create(args: CreateArgs): Promise<EntityAgent> {
    const { data } = args
    try {
      const agent = await this.prisma.agent.create({
        data,
        select: this.getSelector("EntityAgent"),
      })
      return agent
    } catch (e) {
      throw this.throwPrismaError(e)
    }
  }

  async update(args: UpdateArgs): Promise<EntityAgent> {
    const { data, where } = args
    try {
      const agent = await this.prisma.agent.update({
        where,
        data,
        select: this.getSelector("EntityAgent"),
      })
      return agent
    } catch (e) {
      throw this.throwPrismaError(e)
    }
  }

  async upsert(args: UpsertArgs): Promise<EntityAgent> {
    const { where, create, update } = args
    try {
      const agent = await this.prisma.agent.upsert({
        where,
        create,
        update,
        select: this.getSelector("EntityAgent"),
      })
      return agent
    } catch (e) {
      throw this.throwPrismaError(e)
    }
  }

  async delete(args: DeleteArgs): Promise<void> {
    const { where, physically } = args
    try {
      if (physically) {
        await this.prisma.agent.delete({ where })
      } else {
        await this.prisma.agent.update({
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
        await this.prisma.agent.deleteMany({ where })
      } else {
        await this.prisma.agent.updateMany({
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
      const w: Prisma.AgentWhereInput = { deletedAt: null, ...where }
      return await this.prisma.agent.count({ where: w })
    } catch (e) {
      throw this.throwPrismaError(e)
    }
  }

  async exists(args: FindArgs): Promise<boolean> {
    const { where } = args
    try {
      const w: Prisma.AgentWhereInput = { deletedAt: null, ...where }
      const agent = await this.prisma.agent.findFirst({ where: w, select: { id: true } })
      return agent !== null
    } catch (e) {
      throw this.throwPrismaError(e)
    }
  }

  async find(selector: "EntityAgent", args: FindArgs): Promise<EntityAgent> {
    const { where } = args
    try {
      const w: Prisma.AgentWhereInput = { deletedAt: null, ...where }
      return await this.prisma.agent.findFirstOrThrow({
        where: w,
        select: this.getSelector(selector),
      })
    } catch (e) {
      throw this.throwPrismaError(e)
    }
  }

  async findIfExists(selector: "EntityAgent", args: FindArgs): Promise<EntityAgent | null> {
    const { where } = args
    try {
      const w: Prisma.AgentWhereInput = { deletedAt: null, ...where }
      return await this.prisma.agent.findFirst({
        where: w,
        select: this.getSelector(selector),
      })
    } catch (e) {
      throw this.throwPrismaError(e)
    }
  }

  async findAll(selector: "EntityAgent", args: FindAllArgs): Promise<EntityAgent[]> {
    const { where, sortBy, sortDirection } = args
    try {
      const w: Prisma.AgentWhereInput = { deletedAt: null, ...where }
      return await this.prisma.agent.findMany({
        where: w,
        select: this.getSelector(selector),
        orderBy: this.getSortBy({ sortBy, sortDirection }),
      })
    } catch (e) {
      throw this.throwPrismaError(e)
    }
  }

  async findMany(selector: "EntityAgent", args: FindManyArgs): Promise<FindManyResult> {
    const { where, page, take, sortBy, sortDirection } = args
    try {
      const t = take || this.defaultTake
      const w: Prisma.AgentWhereInput = { deletedAt: null, ...where }
      const count = await this.prisma.agent.count({ where: w })
      const agents = await this.prisma.agent.findMany({
        where: w,
        skip: (page ?? 0) * t,
        take: t,
        select: this.getSelector(selector),
        orderBy: this.getSortBy({ sortBy, sortDirection }),
      })
      return { data: agents, ...this.getPage({ currentPage: page, count, take: t }) }
    } catch (e) {
      throw this.throwPrismaError(e)
    }
  }

  private getSortBy(sortBy: PageArg<AgentSortBy>): Prisma.AgentOrderByWithRelationInput {
    const { sortBy: s, sortDirection: d } = sortBy
    const direction = d || "asc"
    switch (s) {
      case "updatedAt":
        return { updatedAt: direction }
      case "name":
        return { name: direction }
      case "tier":
        return { tier: direction }
      case "createdAt":
      default:
        return { createdAt: direction }
    }
  }
}
