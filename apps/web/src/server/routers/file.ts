import z from "zod"
import { zfd } from "zod-form-data"

import { FileDescriptorSortByList, FileHistorySortByList } from "@wr/db"
import { SortDirectionList } from "@wr/shared"

import { getWebAppDiContainer } from "../container"
import { Resolver } from "../resolver"
import { privateProcedure } from "../trpc"

export const fileUploadFiles = privateProcedure
  .input(
    zfd.formData({
      parentId: zfd.text(),
      files: zfd.repeatableOfType(zfd.file()),
    })
  )
  .mutation(async ({ input }) => {
    const resolver = getWebAppDiContainer().resolve<Resolver>("Resolver")
    const service = await resolver.resolveFileService()
    const { parentId, files } = input
    await service.uploadFile({ parentId, files })
  })

export const fileUploadFileToChat = privateProcedure
  .input(
    zfd.formData({
      chatId: zfd.text(),
      file: zfd.file(),
    })
  )
  .mutation(async ({ input }) => {
    const resolver = getWebAppDiContainer().resolve<Resolver>("Resolver")
    const service = await resolver.resolveFileService()
    const { chatId, file } = input
    return await service.uploadFileToChat({ chatId, file })
  })

export const fileGetContent = privateProcedure
  .input(z.object({ id: z.string(), historyId: z.string().optional() }))
  .query(async ({ input }) => {
    const resolver = getWebAppDiContainer().resolve<Resolver>("Resolver")
    const service = await resolver.resolveFileService()
    const { id, historyId } = input
    const content = await service.getBinaryFileContent({ id, historyId })
    return Array.from(new Uint8Array(content))
  })

export const fileGet = privateProcedure.input(z.object({ id: z.string() })).query(async ({ input }) => {
  const resolver = getWebAppDiContainer().resolve<Resolver>("Resolver")
  const service = await resolver.resolveFileService()
  const { id } = input
  return await service.get({ id })
})

export const fileGetList = privateProcedure
  .input(
    z.object({
      parentId: z.string().optional(),
      cursor: z.number().optional(),
      sortBy: z.enum(FileDescriptorSortByList).optional(),
      sortDirection: z.enum(SortDirectionList).optional(),
    })
  )
  .query(async ({ input }) => {
    const resolver = getWebAppDiContainer().resolve<Resolver>("Resolver")
    const service = await resolver.resolveFileService()
    const { parentId, cursor, ...rest } = input
    if (!parentId) {
      const root = await service.ensureRootDir()
      return await service.getFilesInFolder({ id: root.id, page: cursor, ...rest })
    } else {
      return await service.getFilesInFolder({ id: parentId, page: cursor, ...rest })
    }
  })

export const fileGetParentOrRoot = privateProcedure.input(z.object({ id: z.string().optional() })).query(async ({ input }) => {
  const resolver = getWebAppDiContainer().resolve<Resolver>("Resolver")
  const service = await resolver.resolveFileService()
  const { id } = input
  return await service.getParentOrRoot({ id })
})

export const fileDeleteMany = privateProcedure.input(z.object({ ids: z.array(z.string()) })).mutation(async ({ input }) => {
  const resolver = getWebAppDiContainer().resolve<Resolver>("Resolver")
  const service = await resolver.resolveFileService()
  const { ids } = input
  await service.deleteMany({ ids })
})

export const fileCreateDirectory = privateProcedure
  .input(z.object({ parentId: z.string(), name: z.string() }))
  .mutation(async ({ input }) => {
    const resolver = getWebAppDiContainer().resolve<Resolver>("Resolver")
    const service = await resolver.resolveFileService()
    const { parentId, name } = input
    return await service.createDirectory({ parentId, name })
  })

export const fileRename = privateProcedure.input(z.object({ descId: z.string(), newName: z.string() })).mutation(async ({ input }) => {
  const resolver = getWebAppDiContainer().resolve<Resolver>("Resolver")
  const service = await resolver.resolveFileService()
  const { descId, newName } = input
  return await service.rename({ descId, newName })
})

export const fileCopy = privateProcedure
  .input(z.object({ descId: z.string(), newName: z.string().optional() }))
  .mutation(async ({ input }) => {
    const resolver = getWebAppDiContainer().resolve<Resolver>("Resolver")
    const service = await resolver.resolveFileService()
    const { descId, newName } = input
    return await service.copyFile({ descId, newName })
  })

export const fileMove = privateProcedure.input(z.object({ descId: z.string(), targetFolderId: z.string() })).mutation(async ({ input }) => {
  const resolver = getWebAppDiContainer().resolve<Resolver>("Resolver")
  const service = await resolver.resolveFileService()
  const { descId, targetFolderId } = input
  return await service.moveFile({ descId, targetFolderId })
})

export const fileHistoryGetList = privateProcedure
  .input(
    z.object({
      descId: z.string().optional(),
      cursor: z.number().optional(),
      sortBy: z.enum(FileHistorySortByList).optional(),
      sortDirection: z.enum(SortDirectionList).optional(),
    })
  )
  .query(async ({ input }) => {
    if (!input.descId) {
      return {
        data: [],
        nextPage: undefined,
        count: 0,
        maxPage: 0,
      }
    } else {
      const resolver = getWebAppDiContainer().resolve<Resolver>("Resolver")
      const service = await resolver.resolveFileService()
      const { descId, cursor, ...rest } = input
      return await service.getHistoryList({ descId, page: cursor, ...rest })
    }
  })

export const fileHistoryRestore = privateProcedure.input(z.object({ historyId: z.string() })).mutation(async ({ input }) => {
  const resolver = getWebAppDiContainer().resolve<Resolver>("Resolver")
  const service = await resolver.resolveFileService()
  await service.restoreHistory(input.historyId)
})
