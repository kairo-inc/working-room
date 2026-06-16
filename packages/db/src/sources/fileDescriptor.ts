/* eslint-disable @typescript-eslint/no-explicit-any */
import { Prisma, PrismaClient } from "@prisma/client"
import { inject, injectable } from "tsyringe"

import { ImplementationError, PageArg } from "@wr/shared"
import { getPrivateContext } from "@wr/shared-node"

import { EntityFileDescriptor, FileDescriptorSortBy } from "../entities/fileDescriptor"
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

type Selector = "EntityFileDescriptor"

type CreateArgs = BaseCreateArgs<Omit<Prisma.FileDescriptorCreateInput, "tenantId" | "tenant">>
type UpdateArgs = BaseUpdateArgs<Prisma.FileDescriptorUpdateInput, Prisma.FileDescriptorWhereUniqueInput>
type UpsertArgs = BaseUpsertArgs<Prisma.FileDescriptorCreateInput, Prisma.FileDescriptorUpdateInput, Prisma.FileDescriptorWhereUniqueInput>
type FindArgs = BaseFindArgs<Prisma.FileDescriptorWhereInput>
type FindAllArgs = BaseFindAllArgs<Prisma.FileDescriptorWhereInput, FileDescriptorSortBy>
type FindManyArgs = BaseFindManyArgs<Prisma.FileDescriptorWhereInput, FileDescriptorSortBy>
type FindManyResult = BaseFindManyRet<EntityFileDescriptor>
type DeleteArgs = BaseDeleteArgs<Prisma.FileDescriptorWhereUniqueInput>
type DeleteManyArgs = BaseDeleteManyArgs<Prisma.FileDescriptorWhereInput>

export abstract class FileDescriptorSource extends BaseDatabaseSource {
  protected getSelector(selector: Selector) {
    switch (selector) {
      case "EntityFileDescriptor":
        return EntityFileDescriptor.select
      default:
        throw new ImplementationError(`Unknown selector: ${selector}`)
    }
  }

  abstract create(args: CreateArgs): Promise<EntityFileDescriptor>
  abstract update(args: UpdateArgs): Promise<EntityFileDescriptor>
  abstract upsert(args: UpsertArgs): Promise<EntityFileDescriptor>
  abstract delete(args: DeleteArgs): Promise<void>
  abstract deleteMany(args: DeleteManyArgs): Promise<void>
  abstract count(args: FindArgs): Promise<number>
  abstract exists(args: FindArgs): Promise<boolean>

  abstract find(selector: "EntityFileDescriptor", args: FindArgs): Promise<EntityFileDescriptor>
  abstract findIfExists(selector: "EntityFileDescriptor", args: FindArgs): Promise<EntityFileDescriptor | null>
  abstract findAll(selector: "EntityFileDescriptor", args: FindAllArgs): Promise<EntityFileDescriptor[]>
  abstract findMany(selector: "EntityFileDescriptor", args: FindManyArgs): Promise<FindManyResult>
}

@injectable()
export class FileDescriptorSourceImpl extends FileDescriptorSource {
  constructor(@inject("PrismaClient") private prisma: PrismaClient) {
    super()
  }
  async create(args: CreateArgs): Promise<EntityFileDescriptor> {
    const { data } = args
    try {
      const { tenantId } = getPrivateContext()
      const fileDescriptor = await this.prisma.fileDescriptor.create({
        data: { ...data, tenant: { connect: { id: tenantId } } },
        select: this.getSelector("EntityFileDescriptor"),
      })
      return fileDescriptor
    } catch (e) {
      throw this.throwPrismaError(e)
    }
  }

  async update(args: UpdateArgs): Promise<EntityFileDescriptor> {
    const { data, where } = args
    try {
      const fileDescriptor = await this.prisma.fileDescriptor.update({
        where,
        data,
        select: this.getSelector("EntityFileDescriptor"),
      })
      return fileDescriptor
    } catch (e) {
      throw this.throwPrismaError(e)
    }
  }

  async upsert(args: UpsertArgs): Promise<EntityFileDescriptor> {
    const { where, create, update } = args
    try {
      const fileDescriptor = await this.prisma.fileDescriptor.upsert({
        where,
        create,
        update,
        select: this.getSelector("EntityFileDescriptor"),
      })
      return fileDescriptor
    } catch (e) {
      throw this.throwPrismaError(e)
    }
  }

  async delete(args: DeleteArgs): Promise<void> {
    const { where, physically } = args
    try {
      if (physically) {
        await this.prisma.fileDescriptor.delete({
          where,
        })
      } else {
        await this.prisma.fileDescriptor.update({
          where,
          data: { deletedAt: new Date(), status: "deleted" },
        })
      }
    } catch (e) {
      throw this.throwPrismaError(e)
    }
  }

  async deleteMany(args: DeleteManyArgs): Promise<void> {
    const { where, physically } = args
    const w: Prisma.FileDescriptorWhereInput = { deletedAt: null, ...where }
    try {
      if (physically) {
        await this.prisma.fileDescriptor.deleteMany({
          where: w,
        })
      } else {
        const client = this.prisma
        const fileDescriptors = await client.fileDescriptor.findMany({ where: w, select: { id: true } })
        await client.$transaction(async (tx) => {
          await Promise.all(
            fileDescriptors.map((fd) =>
              tx.fileDescriptor.update({
                where: { id: fd.id },
                data: { deletedAt: new Date(), status: "deleted" },
              })
            )
          )
        })
      }
    } catch (e) {
      throw this.throwPrismaError(e)
    }
  }

  async count(args: FindArgs): Promise<number> {
    const { where } = args
    try {
      const w: Prisma.FileDescriptorWhereInput = { deletedAt: null, ...where }
      return await this.prisma.fileDescriptor.count({ where: w })
    } catch (e) {
      throw this.throwPrismaError(e)
    }
  }

  async exists(args: FindArgs): Promise<boolean> {
    const { where } = args
    try {
      const w: Prisma.FileDescriptorWhereInput = { deletedAt: null, ...where }
      const fileDescriptor = await this.prisma.fileDescriptor.findFirst({ where: w, select: { id: true } })
      return fileDescriptor !== null
    } catch (e) {
      throw this.throwPrismaError(e)
    }
  }

  async find(selector: Selector, args: FindArgs): Promise<any> {
    const { where } = args
    try {
      const w: Prisma.FileDescriptorWhereInput = { deletedAt: null, ...where }
      return await this.prisma.fileDescriptor.findFirstOrThrow({
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
      const w: Prisma.FileDescriptorWhereInput = { deletedAt: null, ...where }
      return await this.prisma.fileDescriptor.findFirst({
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
      const w: Prisma.FileDescriptorWhereInput = { deletedAt: null, ...where }
      return await this.prisma.fileDescriptor.findMany({
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
      const w: Prisma.FileDescriptorWhereInput = { deletedAt: null, ...where }
      const count = await this.prisma.fileDescriptor.count({ where: w })
      const fileDescriptors = await this.prisma.fileDescriptor.findMany({
        where: w,
        skip: (page ?? 0) * t,
        take: t,
        select: this.getSelector(selector),
        orderBy: this.getSortBy({ sortBy, sortDirection }),
      })
      return { data: fileDescriptors, ...this.getPage({ currentPage: page, count, take: t }) }
    } catch (e) {
      throw this.throwPrismaError(e)
    }
  }

  private getSortBy(sortBy: PageArg<FileDescriptorSortBy>): Prisma.FileDescriptorOrderByWithRelationInput {
    const { sortBy: s, sortDirection: d } = sortBy
    const direction = d || "asc"
    switch (s) {
      case "name":
        return { name: direction }
      case "createdAt":
        return { createdAt: direction }
      case "updatedAt":
        return { updatedAt: direction }
      case "size":
        return { size: direction }
      case "id":
      default:
        return { id: direction }
    }
  }
}
