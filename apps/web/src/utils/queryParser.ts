import { GetServerSidePropsContext, NextApiRequest } from "next"

import { NotFoundError, PageArg } from "@wr/shared"

type Context = GetServerSidePropsContext | NextApiRequest

export const ensureQuery = (ctx: Context, name: string): string => {
  const value = ctx.query[name]
  if (typeof value !== "string") {
    throw new NotFoundError(`'${name}' is not found in query.`)
  }
  return value
}

export const ensureQueryOrNull = (ctx: Context, name: string): string | null => {
  const value = ctx.query[name]
  if (typeof value !== "string") {
    return null
  }
  return value
}

export const ensurePage = <S>(ctx: Context): PageArg<S> => {
  const { page, sortBy, sortDirection } = ctx.query
  let arg = {}

  if (typeof page === "string") {
    let pageNum = Number(page)
    if (isNaN(pageNum) || pageNum < 1) {
      pageNum = 0 // Starts from 0.
    }
    arg = { page: pageNum }
  }
  if (typeof sortBy === "string") {
    arg = { ...arg, sortBy }
  }
  if (typeof sortDirection === "string") {
    arg = { ...arg, sortDirection }
  }

  return arg
}
