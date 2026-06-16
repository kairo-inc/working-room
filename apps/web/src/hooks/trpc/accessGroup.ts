import { BadRequestError, InvalidChatDirAccessError, InvalidPrivateDirAccessError } from "@wr/shared"

import { L } from "../../localization"
import { handleError } from "../../middleware/trpc"
import { trpc } from "../../utils/trpc"

export const useAccessGroupCreate = () => {
  const { mutateAsync, mutate: _, ...rest } = trpc.accessGroupCreate.useMutation()
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
              error: InvalidChatDirAccessError,
              message: L.accessGroup.chatDirNotAllowed,
            },
            {
              error: InvalidPrivateDirAccessError,
              message: L.accessGroup.privateDirNotAllowed,
            },
          ],
          L.accessGroup.createFailed
        )
      }
    },
  }
}

export const useAccessGroupDelete = () => {
  const { mutateAsync, mutate: _, ...rest } = trpc.accessGroupDelete.useMutation()
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
              message: L.accessGroup.personalGroupNotDeletable,
            },
          ],
          L.accessGroup.deleteFailed
        )
      }
    },
  }
}
