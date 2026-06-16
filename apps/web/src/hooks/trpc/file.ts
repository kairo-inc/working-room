import { FileHistorySortBy } from "@wr/db"
import { BadRequestError, SortDirection } from "@wr/shared"

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
        return handleError(e, [], "Failed to upload file.")
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
        return handleError(e, [], "Failed to upload file to chat.")
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

export const useFileDeleteMany = () => {
  const { mutateAsync, mutate: _, ...rest } = trpc.fileDeleteMany.useMutation()
  return {
    ...rest,
    mutateAsync: async (...args: Parameters<typeof mutateAsync>) => {
      try {
        return await mutateAsync(...args)
      } catch (e) {
        return handleError(e, [], "Failed to delete file.")
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
        return handleError(e, [], "Failed to create directory.")
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
        return handleError(e, [], "Failed to rename file.")
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
              message: "You cannot copy a directory.",
            },
          ],
          "Failed to copy file."
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
        return handleError(e, [], "Failed to move file.")
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
        return handleError(e, [], "Failed to restore file history.")
      }
    },
  }
}
