import { PermissionDeniedError, ValidationError } from "@wr/shared"

import { L } from "../../localization"
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
        return handleError(
          e,
          [
            { error: ValidationError, message: L.common.invalidInput },
            { error: PermissionDeniedError, message: L.tenant.cannotInviteUser },
          ],
          L.tenant.inviteUserFailed
        )
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
        return handleError(
          e,
          [
            { error: ValidationError, message: L.common.invalidInput },
            { error: PermissionDeniedError, message: L.tenant.cannotEditTenant },
          ],
          L.tenant.editTenantFailed
        )
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
        return handleError(e, [{ error: PermissionDeniedError, message: L.tenant.cannotDeleteUser }], L.tenant.deleteUserFailed)
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
        return handleError(e, [{ error: PermissionDeniedError, message: L.tenant.cannotResetPassword }], L.tenant.resetPasswordFailed)
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
        return handleError(e, [{ error: PermissionDeniedError, message: L.tenant.cannotChangeRole }], L.tenant.changeRoleFailed)
      }
    },
  }
}
