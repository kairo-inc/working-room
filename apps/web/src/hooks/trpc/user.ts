import { BadRequestError } from "@wr/shared"

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
        return handleError(e, [{ error: BadRequestError, message: "Cannot edit user." }], "Failed to edit user.")
      }
    },
  }
}
