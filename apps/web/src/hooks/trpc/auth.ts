import { signOut } from "next-auth/react"

import { AlreadyExistsError } from "@wr/shared"

import { handleError } from "../../middleware/trpc"
import { trpc } from "../../utils/trpc"

export const useAuthSignup = () => {
  const { mutateAsync, mutate: _, ...rest } = trpc.authSignup.useMutation()
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
              error: AlreadyExistsError,
              message: "The app is running in 'single-tenant' mode and a tenant already exists.\nPlease contact support for access.",
            },
          ],
          "Failed to sign up."
        )
      }
    },
  }
}

export const useAuthInitiatePassword = () => {
  const { mutateAsync, mutate: _, ...rest } = trpc.authInitiatePassword.useMutation()
  return {
    ...rest,
    mutateAsync: async (...args: Parameters<typeof mutateAsync>) => {
      try {
        return await mutateAsync(...args)
      } catch (e) {
        return handleError(e, [], "Failed to initialize password.")
      }
    },
  }
}

export const useAuthSignout = () => {
  const { mutateAsync, mutate: _, ...rest } = trpc.authSignout.useMutation()
  return {
    ...rest,
    mutateAsync: async (...args: Parameters<typeof mutateAsync>) => {
      try {
        await mutateAsync(...args)
        await signOut()
      } catch (e) {
        return handleError(e, [], "Failed to sign out.")
      }
    },
  }
}
