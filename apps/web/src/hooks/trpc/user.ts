import { UserSortBy } from "@wr/db"
import { BadRequestError, SortDirection } from "@wr/shared"

import { L } from "../../localization"
import { handleError } from "../../middleware/trpc"
import { trpc } from "../../utils/trpc"

export const useUserEdit = () => {
  const { mutateAsync, mutate: _, ...rest } = trpc.userEdit.useMutation()
  return {
    ...rest,
    mutateAsync: async (...args: Parameters<typeof mutateAsync>) => {
      try {
        return await mutateAsync(...args)
      } catch (e) {
        return handleError(e, [{ error: BadRequestError, message: L.user.cannotEditUser }], L.user.editFailed)
      }
    },
  }
}

export const useUserGetList = (args: { charContains?: string; take?: number; sortBy?: UserSortBy; sortDirection?: SortDirection }) => {
  return trpc.userGetList.useInfiniteQuery(
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
