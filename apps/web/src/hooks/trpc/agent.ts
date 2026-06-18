import { handleError } from "../../middleware/trpc"
import { trpc } from "../../utils/trpc"

export const useAgentCreate = () => {
  const { mutateAsync, mutate: _, ...rest } = trpc.agentCreate.useMutation()
  return {
    ...rest,
    mutateAsync: async (...args: Parameters<typeof mutateAsync>) => {
      try {
        return await mutateAsync(...args)
      } catch (e) {
        return handleError(e, [], "Failed to create agent.")
      }
    },
  }
}

export const useAgentEdit = () => {
  const { mutateAsync, mutate: _, ...rest } = trpc.agentEdit.useMutation()
  return {
    ...rest,
    mutateAsync: async (...args: Parameters<typeof mutateAsync>) => {
      try {
        return await mutateAsync(...args)
      } catch (e) {
        return handleError(e, [], "Failed to edit agent.")
      }
    },
  }
}
