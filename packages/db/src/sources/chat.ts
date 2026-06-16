/* eslint-disable @typescript-eslint/no-explicit-any */
import { Prisma, PrismaClient } from "@prisma/client"
import { inject, injectable } from "tsyringe"

import { ImplementationError, PageArg } from "@wr/shared"

import { ChatSortBy, EntityChat, EntityChatStatus } from "../entities/chat"
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

type Selector = "EntityChat" | "EntityChatStatus"

type CreateArgs = BaseCreateArgs<Prisma.ChatCreateInput>
type UpdateArgs = BaseUpdateArgs<Prisma.ChatUpdateInput, Prisma.ChatWhereUniqueInput>
type UpsertArgs = BaseUpsertArgs<Prisma.ChatCreateInput, Prisma.ChatUpdateInput, Prisma.ChatWhereUniqueInput>
type FindArgs = BaseFindArgs<Prisma.ChatWhereInput>
type FindAllArgs = BaseFindAllArgs<Prisma.ChatWhereInput, ChatSortBy>
type FindManyArgs = BaseFindManyArgs<Prisma.ChatWhereInput, ChatSortBy>
type FindManyResult<T> = BaseFindManyRet<T>
type DeleteArgs = BaseDeleteArgs<Prisma.ChatWhereUniqueInput>
type DeleteManyArgs = BaseDeleteManyArgs<Prisma.ChatWhereInput>

export abstract class ChatSource extends BaseDatabaseSource {
  protected getSelector(selector: Selector) {
    switch (selector) {
      case "EntityChat":
        return EntityChat.select
      case "EntityChatStatus":
        return EntityChatStatus.select
      default:
        throw new ImplementationError(`Unknown selector: ${selector}`)
    }
  }

  abstract create(args: CreateArgs): Promise<EntityChat>
  abstract update(args: UpdateArgs): Promise<EntityChat>
  abstract upsert(args: UpsertArgs): Promise<EntityChat>
  abstract delete(args: DeleteArgs): Promise<void>
  abstract deleteMany(args: DeleteManyArgs): Promise<void>
  abstract count(args: FindArgs): Promise<number>
  abstract exists(args: FindArgs): Promise<boolean>
  abstract find(selector: "EntityChat", args: FindArgs): Promise<EntityChat>
  abstract find(selector: "EntityChatStatus", args: FindArgs): Promise<EntityChatStatus>
  abstract findIfExists(selector: "EntityChat", args: FindArgs): Promise<EntityChat | null>
  abstract findIfExists(selector: "EntityChatStatus", args: FindArgs): Promise<EntityChatStatus | null>
  abstract findAll(selector: "EntityChat", args: FindAllArgs): Promise<EntityChat[]>
  abstract findAll(selector: "EntityChatStatus", args: FindAllArgs): Promise<EntityChatStatus[]>
  abstract findMany(selector: "EntityChat", args: FindManyArgs): Promise<FindManyResult<EntityChat>>
  abstract findMany(selector: "EntityChatStatus", args: FindManyArgs): Promise<FindManyResult<EntityChatStatus>>
}

@injectable()
export class ChatSourceImpl extends ChatSource {
  constructor(@inject("PrismaClient") private prisma: PrismaClient) {
    super()
  }

  async create(args: CreateArgs): Promise<any> {
    const { data } = args
    try {
      const chat = await this.prisma.chat.create({
        data,
        select: this.getSelector("EntityChat"),
      })
      return chat
    } catch (e) {
      throw this.throwPrismaError(e)
    }
  }

  async update(args: UpdateArgs): Promise<any> {
    const { data, where } = args
    try {
      const chat = await this.prisma.chat.update({
        where,
        data,
        select: this.getSelector("EntityChat"),
      })
      return chat
    } catch (e) {
      throw this.throwPrismaError(e)
    }
  }

  async upsert(args: UpsertArgs): Promise<any> {
    const { where, create, update } = args
    try {
      const chat = await this.prisma.chat.upsert({
        where,
        create,
        update,
        select: this.getSelector("EntityChat"),
      })
      return chat
    } catch (e) {
      throw this.throwPrismaError(e)
    }
  }

  async delete(args: DeleteArgs): Promise<void> {
    const { where, physically } = args
    try {
      if (physically) {
        await this.prisma.chat.delete({
          where,
        })
      } else {
        await this.prisma.chat.update({
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
        await this.prisma.chat.deleteMany({
          where,
        })
      } else {
        await this.prisma.chat.updateMany({
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
      const w: Prisma.ChatWhereInput = { deletedAt: null, ...where }
      return await this.prisma.chat.count({ where: w })
    } catch (e) {
      throw this.throwPrismaError(e)
    }
  }

  async exists(args: FindArgs): Promise<boolean> {
    const { where } = args
    try {
      const w: Prisma.ChatWhereInput = { deletedAt: null, ...where }
      const chat = await this.prisma.chat.findFirst({ where: w, select: { id: true } })
      return chat !== null
    } catch (e) {
      throw this.throwPrismaError(e)
    }
  }

  async find(selector: Selector, args: FindArgs): Promise<any> {
    const { where } = args
    try {
      const w: Prisma.ChatWhereInput = { deletedAt: null, ...where }
      return await this.prisma.chat.findFirstOrThrow({
        where: w,
        select: this.getSelector(selector),
      })
    } catch (e) {
      throw this.throwPrismaError(e)
    }
  }

  async findIfExists(selector: Selector, args: FindArgs): Promise<any> {
    const { where } = args
    try {
      const w: Prisma.ChatWhereInput = { deletedAt: null, ...where }
      return await this.prisma.chat.findFirst({
        where: w,
        select: this.getSelector(selector),
      })
    } catch (e) {
      throw this.throwPrismaError(e)
    }
  }

  async findAll(selector: Selector, args: FindAllArgs): Promise<any[]> {
    const { where, sortBy, sortDirection } = args
    try {
      const w: Prisma.ChatWhereInput = { deletedAt: null, ...where }
      return await this.prisma.chat.findMany({
        where: w,
        select: this.getSelector(selector),
        orderBy: this.getSortBy({ sortBy, sortDirection }),
      })
    } catch (e) {
      throw this.throwPrismaError(e)
    }
  }

  async findMany(selector: Selector, args: FindManyArgs): Promise<any> {
    const { where, page, take, sortBy, sortDirection } = args
    try {
      const t = take || this.defaultTake
      const w: Prisma.ChatWhereInput = { deletedAt: null, ...where }
      const count = await this.prisma.chat.count({ where: w })
      const chats = await this.prisma.chat.findMany({
        where: w,
        skip: (page ?? 0) * t,
        take: t,
        select: this.getSelector(selector),
        orderBy: this.getSortBy({ sortBy, sortDirection }),
      })
      return { data: chats, ...this.getPage({ currentPage: page, count, take: t }) }
    } catch (e) {
      throw this.throwPrismaError(e)
    }
  }

  private getSortBy(sortBy: PageArg<ChatSortBy>): Prisma.ChatOrderByWithRelationInput {
    const { sortBy: s, sortDirection: d } = sortBy
    const direction = d || "asc"
    switch (s) {
      case "createdAt":
        return { createdAt: direction }
      case "updatedAt":
        return { updatedAt: direction }
      default:
        return { createdAt: direction }
    }
  }
}
