import { Prisma, PrismaClient } from "@prisma/client"
import { inject, injectable } from "tsyringe"

import { ImplementationError, PageArg } from "@wr/shared"

import { EntityFileHistory, FileHistorySortBy } from "../entities/fileHistory"
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

type Selector = "EntityFileHistory"

type CreateArgs = BaseCreateArgs<Prisma.FileHistoryCreateInput>
type UpdateArgs = BaseUpdateArgs<Prisma.FileHistoryUpdateInput, Prisma.FileHistoryWhereUniqueInput>
type UpsertArgs = BaseUpsertArgs<Prisma.FileHistoryCreateInput, Prisma.FileHistoryUpdateInput, Prisma.FileHistoryWhereUniqueInput>
type FindArgs = BaseFindArgs<Prisma.FileHistoryWhereInput>
type FindAllArgs = BaseFindAllArgs<Prisma.FileHistoryWhereInput, FileHistorySortBy>
type FindManyArgs = BaseFindManyArgs<Prisma.FileHistoryWhereInput, FileHistorySortBy>
type FindManyResult = BaseFindManyRet<EntityFileHistory>
type DeleteArgs = BaseDeleteArgs<Prisma.FileHistoryWhereUniqueInput>
type DeleteManyArgs = BaseDeleteManyArgs<Prisma.FileHistoryWhereInput>

export abstract class FileHistorySource extends BaseDatabaseSource {
  protected getSelector(selector: Selector) {
    switch (selector) {
      case "EntityFileHistory":
        return EntityFileHistory.select
      default:
        throw new ImplementationError(`Unknown selector: ${selector}`)
    }
  }

  abstract create(args: CreateArgs): Promise<EntityFileHistory>
  abstract update(args: UpdateArgs): Promise<EntityFileHistory>
  abstract upsert(args: UpsertArgs): Promise<EntityFileHistory>
  abstract delete(args: DeleteArgs): Promise<void>
  abstract deleteMany(args: DeleteManyArgs): Promise<void>
  abstract count(args: FindArgs): Promise<number>
  abstract exists(args: FindArgs): Promise<boolean>
  abstract find(selector: "EntityFileHistory", args: FindArgs): Promise<EntityFileHistory>
  abstract findIfExists(selector: "EntityFileHistory", args: FindArgs): Promise<EntityFileHistory | null>
  abstract findAll(selector: "EntityFileHistory", args: FindAllArgs): Promise<EntityFileHistory[]>
  abstract findMany(selector: "EntityFileHistory", args: FindManyArgs): Promise<FindManyResult>
}

@injectable()
export class FileHistorySourceImpl extends FileHistorySource {
  constructor(@inject("PrismaClient") private prisma: PrismaClient) {
    super()
  }

  async create(args: CreateArgs): Promise<EntityFileHistory> {
    const { data } = args
    try {
      const fileHistory = await this.prisma.fileHistory.create({
        data,
        select: this.getSelector("EntityFileHistory"),
      })
      return fileHistory
    } catch (e) {
      throw this.throwPrismaError(e)
    }
  }

  async update(args: UpdateArgs): Promise<EntityFileHistory> {
    const { data, where } = args
    try {
      const fileHistory = await this.prisma.fileHistory.update({
        where,
        data,
        select: this.getSelector("EntityFileHistory"),
      })
      return fileHistory
    } catch (e) {
      throw this.throwPrismaError(e)
    }
  }

  async upsert(args: UpsertArgs): Promise<EntityFileHistory> {
    const { where, create, update } = args
    try {
      const fileHistory = await this.prisma.fileHistory.upsert({
        where,
        create,
        update,
        select: this.getSelector("EntityFileHistory"),
      })
      return fileHistory
    } catch (e) {
      throw this.throwPrismaError(e)
    }
  }

  async delete(args: DeleteArgs): Promise<void> {
    const { where } = args
    try {
      await this.prisma.fileHistory.delete({
        where,
      })
    } catch (e) {
      throw this.throwPrismaError(e)
    }
  }

  async deleteMany(args: DeleteManyArgs): Promise<void> {
    const { where } = args
    try {
      await this.prisma.fileHistory.deleteMany({
        where,
      })
    } catch (e) {
      throw this.throwPrismaError(e)
    }
  }

  async count(args: FindArgs): Promise<number> {
    const { where } = args
    try {
      return await this.prisma.fileHistory.count({ where })
    } catch (e) {
      throw this.throwPrismaError(e)
    }
  }

  async exists(args: FindArgs): Promise<boolean> {
    const { where } = args
    try {
      const fileHistory = await this.prisma.fileHistory.findFirst({ where, select: { id: true } })
      return fileHistory !== null
    } catch (e) {
      throw this.throwPrismaError(e)
    }
  }

  async find(selector: Selector, args: FindArgs): Promise<EntityFileHistory> {
    const { where } = args
    try {
      return await this.prisma.fileHistory.findFirstOrThrow({
        where,
        select: this.getSelector(selector),
      })
    } catch (e) {
      throw this.throwPrismaError(e)
    }
  }

  async findIfExists(selector: Selector, args: FindArgs): Promise<EntityFileHistory | null> {
    const { where } = args
    try {
      return await this.prisma.fileHistory.findFirst({
        where,
        select: this.getSelector(selector),
      })
    } catch (e) {
      throw this.throwPrismaError(e)
    }
  }

  async findAll(selector: Selector, args: FindAllArgs): Promise<EntityFileHistory[]> {
    const { where, sortBy, sortDirection } = args
    try {
      return await this.prisma.fileHistory.findMany({
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
      const count = await this.prisma.fileHistory.count({ where })
      const fileHistories = await this.prisma.fileHistory.findMany({
        where,
        skip: (page ?? 0) * t,
        take: t,
        select: this.getSelector(selector),
        orderBy: this.getSortBy({ sortBy, sortDirection }),
      })
      return { data: fileHistories, ...this.getPage({ currentPage: page, count, take: t }) }
    } catch (e) {
      throw this.throwPrismaError(e)
    }
  }

  private getSortBy(sortBy: PageArg<FileHistorySortBy>): Prisma.FileHistoryOrderByWithRelationInput {
    const { sortBy: s, sortDirection: d } = sortBy
    const direction = d || "asc"
    switch (s) {
      case "createdAt":
      case "fileDescriptorId":
      case "operation":
        return { [s]: direction }
      default:
        return { createdAt: direction }
    }
  }
}
