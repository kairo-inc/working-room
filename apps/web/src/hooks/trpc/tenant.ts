import { PermissionDeniedError } from "@wr/shared"

import { handleError } from "../../middleware/trpc"
import { trpc } from "../../utils/trpc"

export const useTenantInviteUser = () => {
  const { mutateAsync, mutate: _, ...rest } = trpc.tenantInviteUser.useMutation()
  return {
    ...rest,
    mutateAsync: async (...args: Parameters<typeof mutateAsync>) => {
      try {
        return await mutateAsync(...args)
      } catch (e) {
        return handleError(e, [{ error: PermissionDeniedError, message: "Cannot invite user." }], "Failed to invite user.")
      }
    },
  }
}

export const useTenantEdit = () => {
  const { mutateAsync, mutate: _, ...rest } = trpc.tenantEdit.useMutation()
  return {
    ...rest,
    mutateAsync: async (...args: Parameters<typeof mutateAsync>) => {
      try {
        return await mutateAsync(...args)
      } catch (e) {
        return handleError(e, [{ error: PermissionDeniedError, message: "Cannot edit tenant." }], "Failed to edit tenant.")
      }
    },
  }
}

export const useTenantDeleteUser = () => {
  const { mutateAsync, mutate: _, ...rest } = trpc.tenantDeleteUser.useMutation()
  return {
    ...rest,
    mutateAsync: async (...args: Parameters<typeof mutateAsync>) => {
      try {
        return await mutateAsync(...args)
      } catch (e) {
        return handleError(e, [{ error: PermissionDeniedError, message: "Cannot delete user." }], "Failed to delete user.")
      }
    },
  }
}

export const useTenantResetUserPassword = () => {
  const { mutateAsync, mutate: _, ...rest } = trpc.tenantResetUserPassword.useMutation()
  return {
    ...rest,
    mutateAsync: async (...args: Parameters<typeof mutateAsync>) => {
      try {
        return await mutateAsync(...args)
      } catch (e) {
        return handleError(e, [{ error: PermissionDeniedError, message: "Cannot reset user password." }], "Failed to reset user password.")
      }
    },
  }
}

export const useTenantChangeUserRole = () => {
  const { mutateAsync, mutate: _, ...rest } = trpc.tenantChangeUserRole.useMutation()
  return {
    ...rest,
    mutateAsync: async (...args: Parameters<typeof mutateAsync>) => {
      try {
        return await mutateAsync(...args)
      } catch (e) {
        return handleError(e, [{ error: PermissionDeniedError, message: "Cannot change user role." }], "Failed to change user role.")
      }
    },
  }
}
