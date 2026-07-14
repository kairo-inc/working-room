import { NotFoundError } from "@wr/shared"

import { handleError } from "../../middleware/trpc"
import { trpc } from "../../utils/trpc"

export const useOauthClientDisconnect = () => {
  const { mutateAsync, ...rest } = trpc.oauthClientDisconnect.useMutation()

  return {
    ...rest,
    mutateAsync: async (...args: Parameters<typeof mutateAsync>) => {
      try {
        return await mutateAsync(...args)
      } catch (e) {
        return handleError(e, [{ error: NotFoundError, message: "OAuth client not found." }], "Failed to disconnect the OAuth client.")
      }
    },
  }
}
