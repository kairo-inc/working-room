import { ChatSortBy, MessageSortBy } from "@wr/db"
import { NotFoundError, SortDirection } from "@wr/shared"

import { handleError } from "../../middleware/trpc"
import { AppStreamEvent } from "../../types/stream"
import { trpc } from "../../utils/trpc"

export const useChatGetList = ({
  sortBy,
  sortDirection,
  searchText,
}: {
  sortBy?: ChatSortBy
  sortDirection?: SortDirection
  searchText?: string
}) => {
  return trpc.chatGetList.useInfiniteQuery(
    { sortBy, sortDirection, searchText },
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

export const useChatGetMessages = (id: string, options?: { sortBy?: MessageSortBy; sortDirection?: SortDirection }) => {
  return trpc.chatGetMessages.useInfiniteQuery(
    { id, ...options },
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

export const useChatGetMessagesSetData = (id: string, options?: { sortBy?: MessageSortBy; sortDirection?: SortDirection }) => {
  const utils = trpc.useUtils()
  const input = {
    id,
    sortBy: options?.sortBy,
    sortDirection: options?.sortDirection,
  }
  return (updater: Parameters<typeof utils.chatGetMessages.setInfiniteData>[1]) => {
    return utils.chatGetMessages.setInfiniteData(input, updater)
  }
}

export const useChatDelete = () => {
  const { mutateAsync, mutate: _, ...rest } = trpc.chatDelete.useMutation()
  return {
    ...rest,
    mutateAsync: async (...args: Parameters<typeof mutateAsync>) => {
      try {
        return await mutateAsync(...args)
      } catch (e) {
        return handleError(e, [{ error: NotFoundError, message: "Chat not found." }], "Failed to delete the chat.")
      }
    },
  }
}

export const useChatEdit = () => {
  const { mutateAsync, mutate: _, ...rest } = trpc.chatEdit.useMutation()
  return {
    ...rest,
    mutateAsync: async (...args: Parameters<typeof mutateAsync>) => {
      try {
        return await mutateAsync(...args)
      } catch (e) {
        return handleError(e, [{ error: NotFoundError, message: "Chat not found." }], "Failed to edit the chat.")
      }
    },
  }
}

export const useChatRunSingleLoop = () => {
  return async function* ({
    id,
    message,
    resources,
    approvals,
  }: {
    id: string
    message?: string
    resources?: { descIds: string[] }
    approvals?: { approvalId: string; isApproved: boolean }[]
  }) {
    const result = await fetch(`/api/chat/${id}/run`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ message, resources, approvals }),
    })
    const readable = result.body
    if (!readable) {
      throw new Error("No response body")
    }
    const reader = readable.getReader()
    const decoder = new TextDecoder("utf-8")
    let buffer = ""
    try {
      while (true) {
        const { value, done } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split("\n\n")
        buffer = lines.pop() || ""
        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const dataStr = line.slice(6)
            if (dataStr === "") continue
            try {
              const data = JSON.parse(dataStr) as AppStreamEvent
              yield data
            } catch (error) {
              console.error("Failed to parse JSON:", error, "Data:", dataStr)
            }
          } else if (line.startsWith("event: error")) {
            const errorDataStr = line.slice("event: error\ndata: ".length)
            try {
              const errorData = JSON.parse(errorDataStr)
              return handleError(errorData, [], "An unknown error occurred.")
            } catch (error) {
              console.error("Failed to parse error JSON:", error, "Data:", errorDataStr)
              return handleError({ errorCode: "UnknownError" }, [], "An unknown error occurred.")
            }
          }
        }
      }
    } catch (error) {
      return handleError(error, [], "An unknown error occurred while reading the stream.")
    }
  }
}
