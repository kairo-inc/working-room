import { FileDescriptorSortBy, FileHistorySortBy } from "@wr/db"
import {
  BadRequestError,
  InvalidChatDirAccessError,
  InvalidPrivateDirAccessError,
  InvalidRootDirAccessError,
  PermissionDeniedError,
  SortDirection,
  ValidationError,
} from "@wr/shared"

import { L } from "../../localization"
import { handleError } from "../../middleware/trpc"
import { trpc } from "../../utils/trpc"

export const useFileUploadFiles = () => {
  const { mutateAsync, mutate: _, ...rest } = trpc.fileUploadFiles.useMutation()
  return {
    ...rest,
    mutateAsync: async (formData: FormData) => {
      try {
        return await mutateAsync(formData)
      } catch (e) {
        return handleError(
          e,
          [
            {
              error: PermissionDeniedError,
              message: L.file.errors.uploadPermissionDenied,
            },
          ],
          L.file.errors.uploadFailed
        )
      }
    },
  }
}

export const useFileUploadFileToChat = () => {
  const { mutateAsync, mutate: _, ...rest } = trpc.fileUploadFileToChat.useMutation()
  return {
    ...rest,
    mutateAsync: async (formData: FormData) => {
      try {
        return await mutateAsync(formData)
      } catch (e) {
        return handleError(e, [], L.file.errors.uploadToChatFailed)
      }
    },
  }
}

export const useFileGetContent = ({ id, historyId }: { id: string; historyId?: string }) => {
  return trpc.fileGetContent.useQuery(
    { id, historyId },
    {
      refetchOnMount: false,
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
      staleTime: Infinity,
      gcTime: Infinity,
      retry() {
        return false
      },
    }
  )
}

export const useFileGet = ({ id }: { id: string }) => {
  return trpc.fileGet.useQuery(
    { id },
    {
      refetchOnMount: false,
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
      staleTime: Infinity,
      gcTime: Infinity,
      retry() {
        return false
      },
    }
  )
}

export const useFileGetList = (args?: { parentId?: string; sortBy?: FileDescriptorSortBy; sortDirection?: SortDirection }) => {
  return trpc.fileGetList.useInfiniteQuery(
    { ...args },
    {
      getPreviousPageParam: (firstPage) => {
        if (!firstPage.nextPage || firstPage.nextPage <= 1) return undefined
        return firstPage.nextPage - 1
      },
      getNextPageParam: (lastPage) => {
        if (!lastPage.nextPage || lastPage.nextPage < 0) return undefined
        return lastPage.nextPage
      },
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
    }
  )
}

export const useFileGetParentOrRoot = (id?: string) => {
  return trpc.fileGetParentOrRoot.useQuery(
    { id },
    {
      refetchOnMount: false,
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
      staleTime: Infinity,
      gcTime: Infinity,
      retry() {
        return false
      },
    }
  )
}

export const useFileDeleteMany = () => {
  const { mutateAsync, mutate: _, ...rest } = trpc.fileDeleteMany.useMutation()
  return {
    ...rest,
    mutateAsync: async (...args: Parameters<typeof mutateAsync>) => {
      try {
        return await mutateAsync(...args)
      } catch (e) {
        return handleError(
          e,
          [
            { error: InvalidRootDirAccessError, message: L.file.errors.cannotDeleteRoot },
            { error: InvalidPrivateDirAccessError, message: L.file.errors.cannotDeletePrivate },
            { error: InvalidChatDirAccessError, message: L.file.errors.cannotDeleteChat },
          ],
          L.file.errors.deleteFailed
        )
      }
    },
  }
}

export const useFileCreateDirectory = () => {
  const { mutateAsync, mutate: _, ...rest } = trpc.fileCreateDirectory.useMutation()
  return {
    ...rest,
    mutateAsync: async (...args: Parameters<typeof mutateAsync>) => {
      try {
        return await mutateAsync(...args)
      } catch (e) {
        return handleError(
          e,
          [
            { error: ValidationError, message: L.common.invalidInput },
            {
              error: PermissionDeniedError,
              message: L.file.errors.createDirectoryPermissionDenied,
            },
          ],
          L.file.errors.createDirectoryFailed
        )
      }
    },
  }
}

export const useFileRename = () => {
  const { mutateAsync, mutate: _, ...rest } = trpc.fileRename.useMutation()
  return {
    ...rest,
    mutateAsync: async (...args: Parameters<typeof mutateAsync>) => {
      try {
        return await mutateAsync(...args)
      } catch (e) {
        return handleError(
          e,
          [
            {
              error: PermissionDeniedError,
              message: L.file.errors.renamePermissionDenied,
            },
          ],
          L.file.errors.renameFailed
        )
      }
    },
  }
}

export const useFileCopy = () => {
  const { mutateAsync, mutate: _, ...rest } = trpc.fileCopy.useMutation()
  return {
    ...rest,
    mutateAsync: async (...args: Parameters<typeof mutateAsync>) => {
      try {
        return await mutateAsync(...args)
      } catch (e) {
        return handleError(
          e,
          [
            {
              error: BadRequestError,
              message: L.file.errors.cannotCopyDirectory,
            },
          ],
          L.file.errors.copyFailed
        )
      }
    },
  }
}

export const useFileMove = () => {
  const { mutateAsync, mutate: _, ...rest } = trpc.fileMove.useMutation()
  return {
    ...rest,
    mutateAsync: async (...args: Parameters<typeof mutateAsync>) => {
      try {
        return await mutateAsync(...args)
      } catch (e) {
        return handleError(
          e,
          [
            {
              error: PermissionDeniedError,
              message: L.file.errors.movePermissionDenied,
            },
            { error: InvalidChatDirAccessError, message: L.file.errors.cannotMoveChat },
          ],
          L.file.errors.moveFailed
        )
      }
    },
  }
}

export const useFileGetListHistory = (descId?: string, options?: { sortBy?: FileHistorySortBy; sortDirection?: SortDirection }) => {
  return trpc.fileHistoryGetList.useInfiniteQuery(
    { descId, ...options },
    {
      getPreviousPageParam: (firstPage) => {
        if (!firstPage.nextPage || firstPage.nextPage <= 1) return undefined
        return firstPage.nextPage - 1
      },
      getNextPageParam: (lastPage) => {
        if (!lastPage.nextPage || lastPage.nextPage < 0) return undefined
        return lastPage.nextPage
      },
      refetchOnWindowFocus: false,
      refetchOnReconnect: true,
      refetchOnMount: true,
      enabled: !!descId,
    }
  )
}

export const useFileRestoreHistory = () => {
  const { mutateAsync, mutate: _, ...rest } = trpc.fileHistoryRestore.useMutation()
  return {
    ...rest,
    mutateAsync: async (...args: Parameters<typeof mutateAsync>) => {
      try {
        return await mutateAsync(...args)
      } catch (e) {
        return handleError(
          e,
          [
            {
              error: PermissionDeniedError,
              message: L.file.errors.restoreHistoryPermissionDenied,
            },
          ],
          L.file.errors.restoreHistoryFailed
        )
      }
    },
  }
}
