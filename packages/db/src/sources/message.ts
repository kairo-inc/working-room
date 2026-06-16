import { Prisma, PrismaClient } from "@prisma/client"
import { inject, injectable } from "tsyringe"

import { ImplementationError, PageArg } from "@wr/shared"

import { EntityMessage, MessageSortBy } from "../entities/message"
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

type Selector = "EntityMessage"

type CreateArgs = BaseCreateArgs<Prisma.MessageCreateInput>
type UpdateArgs = BaseUpdateArgs<Prisma.MessageUpdateInput, Prisma.MessageWhereUniqueInput>
type UpsertArgs = BaseUpsertArgs<Prisma.MessageCreateInput, Prisma.MessageUpdateInput, Prisma.MessageWhereUniqueInput>
type FindArgs = BaseFindArgs<Prisma.MessageWhereInput>
type FindAllArgs = BaseFindAllArgs<Prisma.MessageWhereInput, MessageSortBy>
type FindManyArgs = BaseFindManyArgs<Prisma.MessageWhereInput, MessageSortBy>
type FindManyResult = BaseFindManyRet<EntityMessage>
type DeleteArgs = BaseDeleteArgs<Prisma.MessageWhereUniqueInput>
type DeleteManyArgs = BaseDeleteManyArgs<Prisma.MessageWhereInput>

export abstract class MessageSource extends BaseDatabaseSource {
  protected getSelector(selector: Selector) {
    switch (selector) {
      case "EntityMessage":
        return EntityMessage.select
      default:
        throw new ImplementationError(`Unknown selector: ${selector}`)
    }
  }

  abstract create(args: CreateArgs): Promise<EntityMessage>
  abstract update(args: UpdateArgs): Promise<EntityMessage>
  abstract upsert(args: UpsertArgs): Promise<EntityMessage>
  abstract delete(args: DeleteArgs): Promise<void>
  abstract deleteMany(args: DeleteManyArgs): Promise<void>
  abstract count(args: FindArgs): Promise<number>
  abstract exists(args: FindArgs): Promise<boolean>
  abstract find(selector: "EntityMessage", args: FindArgs): Promise<EntityMessage>
  abstract findIfExists(selector: "EntityMessage", args: FindArgs): Promise<EntityMessage | null>
  abstract findAll(selector: "EntityMessage", args: FindAllArgs): Promise<EntityMessage[]>
  abstract findMany(selector: "EntityMessage", args: FindManyArgs): Promise<FindManyResult>
}

@injectable()
export class MessageSourceImpl extends MessageSource {
  constructor(@inject("PrismaClient") private prisma: PrismaClient) {
    super()
  }

  async create(args: CreateArgs): Promise<EntityMessage> {
    const { data } = args
    try {
      const message = await this.prisma.message.create({
        data,
        select: this.getSelector("EntityMessage"),
      })
      return message
    } catch (e) {
      throw this.throwPrismaError(e)
    }
  }

  async update(args: UpdateArgs): Promise<EntityMessage> {
    const { data, where } = args
    try {
      const message = await this.prisma.message.update({
        where,
        data,
        select: this.getSelector("EntityMessage"),
      })
      return message
    } catch (e) {
      throw this.throwPrismaError(e)
    }
  }

  async upsert(args: UpsertArgs): Promise<EntityMessage> {
    const { where, create, update } = args
    try {
      const message = await this.prisma.message.upsert({
        where,
        create,
        update,
        select: this.getSelector("EntityMessage"),
      })
      return message
    } catch (e) {
      throw this.throwPrismaError(e)
    }
  }

  async delete(args: DeleteArgs): Promise<void> {
    const { where, physically } = args
    try {
      if (physically) {
        await this.prisma.message.delete({
          where,
        })
      } else {
        await this.prisma.message.update({
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
        await this.prisma.message.deleteMany({
          where,
        })
      } else {
        await this.prisma.message.updateMany({
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
      const w: Prisma.MessageWhereInput = { deletedAt: null, ...where }
      return await this.prisma.message.count({ where: w })
    } catch (e) {
      throw this.throwPrismaError(e)
    }
  }

  async exists(args: FindArgs): Promise<boolean> {
    const { where } = args
    try {
      const w: Prisma.MessageWhereInput = { deletedAt: null, ...where }
      const message = await this.prisma.message.findFirst({ where: w, select: { id: true } })
      return message !== null
    } catch (e) {
      throw this.throwPrismaError(e)
    }
  }

  async find(selector: Selector, args: FindArgs): Promise<EntityMessage> {
    const { where } = args
    try {
      const w: Prisma.MessageWhereInput = { deletedAt: null, ...where }
      return await this.prisma.message.findFirstOrThrow({
        where: w,
        select: this.getSelector(selector),
      })
    } catch (e) {
      throw this.throwPrismaError(e)
    }
  }

  async findIfExists(selector: Selector, args: FindArgs): Promise<EntityMessage | null> {
    const { where } = args
    try {
      const w: Prisma.MessageWhereInput = { deletedAt: null, ...where }
      return await this.prisma.message.findFirst({
        where: w,
        select: this.getSelector(selector),
      })
    } catch (e) {
      throw this.throwPrismaError(e)
    }
  }

  async findAll(selector: Selector, args: FindAllArgs): Promise<EntityMessage[]> {
    const { where, sortBy, sortDirection } = args
    try {
      const w: Prisma.MessageWhereInput = { deletedAt: null, ...where }
      return await this.prisma.message.findMany({
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
      const w: Prisma.MessageWhereInput = { deletedAt: null, ...where }
      const count = await this.prisma.message.count({ where: w })
      const messages = await this.prisma.message.findMany({
        where: w,
        skip: (page ?? 0) * t,
        take: t,
        select: this.getSelector(selector),
        orderBy: this.getSortBy({ sortBy, sortDirection }),
      })
      return { data: messages, ...this.getPage({ currentPage: page, count, take: t }) }
    } catch (e) {
      throw this.throwPrismaError(e)
    }
  }

  private getSortBy(sortBy: PageArg<MessageSortBy>): Prisma.MessageOrderByWithRelationInput {
    const { sortBy: s, sortDirection: d } = sortBy
    const direction = d || "asc"
    switch (s) {
      case "createdAt":
      case "updatedAt":
      case "sequence":
        return { [s]: direction }
      default:
        return { createdAt: direction }
    }
  }
}
