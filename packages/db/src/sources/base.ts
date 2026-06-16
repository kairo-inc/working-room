/* eslint-disable @typescript-eslint/no-explicit-any */
import { Prisma } from "@prisma/client"

import { AlreadyExistsError, NotFoundError, PageArg, PageResult, SortArg } from "@wr/shared"

export type BaseCreateArgs<Data> = {
  data: Data
}

export type BaseUpdateArgs<Data, Where> = {
  data: Data
  where: Where
}

export type BaseFindArgs<Where> = {
  where: Where
}

export type BaseFindAllArgs<Where, SortBy> = SortArg<SortBy> & {
  where: Where
}

export type BaseFindManyArgs<Where, SortBy> = PageArg<SortBy> & {
  where: Where
}
export type BaseFindManyRet<Model> = PageResult<Model>

export type BaseDeleteArgs<UniqueWhere> = {
  where: UniqueWhere
  physically?: boolean
}

export type BaseUpsertArgs<CreateData, UpdateData, UniqueWhere> = {
  where: UniqueWhere
  create: CreateData
  update: UpdateData
}

export type BaseDeleteManyArgs<Where> = {
  where: Where
  physically?: boolean
}

type Page = {
  currentPage?: number | null
  count: number
  take: number
}

type NextPage = {
  nextPage: number | null
  maxPage: number
  count: number
}

export abstract class BaseDatabaseSource {
  protected defaultTake: number = 12

  abstract create(args: BaseCreateArgs<any>): Promise<any>
  abstract update(args: BaseUpdateArgs<any, any>): Promise<any>
  abstract upsert(args: BaseUpsertArgs<any, any, any>): Promise<any>
  abstract count(args: BaseFindArgs<any>): Promise<number>
  abstract exists(args: BaseFindArgs<any>): Promise<boolean>

  abstract delete(args: BaseDeleteArgs<any>): Promise<void>
  abstract deleteMany(args: BaseDeleteManyArgs<any>): Promise<void>

  abstract find(selector: string, args: BaseFindArgs<any>): Promise<any>
  abstract findIfExists(selector: string, args: BaseFindArgs<any>): Promise<any>
  abstract findAll(selector: string, args: BaseFindAllArgs<any, any>): Promise<any[]>
  abstract findMany(selector: string, args: BaseFindManyArgs<any, any>): Promise<BaseFindManyRet<any>>

  protected throwPrismaError(error: Error): never {
    // Here you can add logging or other error handling logic if needed.
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      const { code, message } = error
      if (code === "P2025") {
        throw new NotFoundError(message)
      } else if (code === "P2002") {
        // Unique constraint failed
        throw new AlreadyExistsError(message)
      }
    }
    throw error
  }

  protected getPage(args: Page): NextPage {
    const { currentPage, count, take } = args
    const page = currentPage ?? 0
    const maxPage = Math.ceil(count / take)
    const nextPage = page < maxPage - 1 ? page + 1 : null
    return {
      nextPage,
      maxPage,
      count,
    }
  }
}
