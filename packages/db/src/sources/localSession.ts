import { Prisma, PrismaClient } from "@prisma/client"
import { inject, injectable } from "tsyringe"

import { ImplementationError, PageArg } from "@wr/shared"

import { EntityLocalSession, LocalSessionSortBy } from "../entities/localSession"
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

type Selector = "EntityLocalSession"

type CreateArgs = BaseCreateArgs<Prisma.LocalSessionCreateInput>
type UpdateArgs = BaseUpdateArgs<Prisma.LocalSessionUpdateInput, Prisma.LocalSessionWhereUniqueInput>
type UpsertArgs = BaseUpsertArgs<Prisma.LocalSessionCreateInput, Prisma.LocalSessionUpdateInput, Prisma.LocalSessionWhereUniqueInput>
type FindArgs = BaseFindArgs<Prisma.LocalSessionWhereInput>
type FindAllArgs = BaseFindAllArgs<Prisma.LocalSessionWhereInput, LocalSessionSortBy>
type FindManyArgs = BaseFindManyArgs<Prisma.LocalSessionWhereInput, LocalSessionSortBy>
type FindManyResult = BaseFindManyRet<EntityLocalSession>
type DeleteArgs = BaseDeleteArgs<Prisma.LocalSessionWhereUniqueInput>
type DeleteManyArgs = BaseDeleteManyArgs<Prisma.LocalSessionWhereInput>

export abstract class LocalSessionSource extends BaseDatabaseSource {
  protected getSelector(selector: Selector) {
    switch (selector) {
      case "EntityLocalSession":
        return EntityLocalSession.select
      default:
        throw new ImplementationError(`Unknown selector: ${selector}`)
    }
  }

  abstract create(args: CreateArgs): Promise<EntityLocalSession>
  abstract update(args: UpdateArgs): Promise<EntityLocalSession>
  abstract upsert(args: UpsertArgs): Promise<EntityLocalSession>
  abstract delete(args: DeleteArgs): Promise<void>
  abstract deleteMany(args: DeleteManyArgs): Promise<void>
  abstract count(args: FindArgs): Promise<number>
  abstract exists(args: FindArgs): Promise<boolean>
  abstract find(selector: "EntityLocalSession", args: FindArgs): Promise<EntityLocalSession>
  abstract findIfExists(selector: "EntityLocalSession", args: FindArgs): Promise<EntityLocalSession | null>
  abstract findAll(selector: "EntityLocalSession", args: FindAllArgs): Promise<EntityLocalSession[]>
  abstract findMany(selector: "EntityLocalSession", args: FindManyArgs): Promise<FindManyResult>
}

@injectable()
export class LocalSessionSourceImpl extends LocalSessionSource {
  constructor(@inject("PrismaClient") private prisma: PrismaClient) {
    super()
  }

  async create(args: CreateArgs): Promise<EntityLocalSession> {
    const { data } = args
    try {
      const localSession = await this.prisma.localSession.create({
        data,
        select: this.getSelector("EntityLocalSession"),
      })
      return localSession
    } catch (e) {
      throw this.throwPrismaError(e)
    }
  }

  async update(args: UpdateArgs): Promise<EntityLocalSession> {
    const { data, where } = args
    try {
      const localSession = await this.prisma.localSession.update({
        where,
        data,
        select: this.getSelector("EntityLocalSession"),
      })
      return localSession
    } catch (e) {
      throw this.throwPrismaError(e)
    }
  }

  async upsert(args: UpsertArgs): Promise<EntityLocalSession> {
    const { where, create, update } = args
    try {
      const localSession = await this.prisma.localSession.upsert({
        where,
        create,
        update,
        select: this.getSelector("EntityLocalSession"),
      })
      return localSession
    } catch (e) {
      throw this.throwPrismaError(e)
    }
  }

  async delete(args: DeleteArgs): Promise<void> {
    const { where, physically } = args
    try {
      if (physically) {
        await this.prisma.localSession.delete({
          where,
        })
      } else {
        await this.prisma.localSession.update({
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
        await this.prisma.localSession.deleteMany({
          where,
        })
      } else {
        await this.prisma.localSession.updateMany({
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
      return await this.prisma.localSession.count({ where })
    } catch (e) {
      throw this.throwPrismaError(e)
    }
  }

  async exists(args: FindArgs): Promise<boolean> {
    const { where } = args
    try {
      const localSession = await this.prisma.localSession.findFirst({ where, select: { id: true } })
      return localSession !== null
    } catch (e) {
      throw this.throwPrismaError(e)
    }
  }

  async find(selector: "EntityLocalSession", args: FindArgs) {
    const { where } = args
    try {
      return await this.prisma.localSession.findFirstOrThrow({
        where,
        select: this.getSelector(selector),
      })
    } catch (e) {
      throw this.throwPrismaError(e)
    }
  }

  async findIfExists(selector: "EntityLocalSession", args: FindArgs) {
    const { where } = args
    try {
      return await this.prisma.localSession.findFirst({
        where,
        select: this.getSelector(selector),
      })
    } catch (e) {
      throw this.throwPrismaError(e)
    }
  }

  async findAll(selector: "EntityLocalSession", args: FindAllArgs) {
    const { where, sortBy, sortDirection } = args
    try {
      return await this.prisma.localSession.findMany({
        where,
        select: this.getSelector(selector),
        orderBy: this.getSortBy({ sortBy, sortDirection }),
      })
    } catch (e) {
      throw this.throwPrismaError(e)
    }
  }

  async findMany(selector: "EntityLocalSession", args: FindManyArgs): Promise<FindManyResult> {
    const { where, page, take, sortBy, sortDirection } = args
    try {
      const t = take || this.defaultTake
      const count = await this.prisma.localSession.count({ where })
      const localSessions = await this.prisma.localSession.findMany({
        where,
        skip: (page ?? 0) * t,
        take: t,
        select: this.getSelector(selector),
        orderBy: this.getSortBy({ sortBy, sortDirection }),
      })
      return { data: localSessions, ...this.getPage({ currentPage: page, count, take: t }) }
    } catch (e) {
      throw this.throwPrismaError(e)
    }
  }

  private getSortBy(sortBy: PageArg<LocalSessionSortBy>): Prisma.LocalSessionOrderByWithRelationInput {
    const { sortBy: s, sortDirection: d } = sortBy
    const direction = d || "asc"
    switch (s) {
      case "createdAt":
        return { createdAt: direction }
      case "updatedAt":
        return { updatedAt: direction }
      case "expiresAt":
        return { expiresAt: direction }
      case "userId":
        return { userId: direction }
      default:
        return { createdAt: direction }
    }
  }
}
