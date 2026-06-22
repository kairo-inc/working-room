import { useMutation } from "@tanstack/react-query"
import { getProviders, signIn } from "next-auth/react"

import { AuthenticationError, PasswordInitializationRequired } from "@wr/shared"

type SigninByEmailArg = {
  email: string
  password: string
  session?: string
}

export const useAuthSigninByEmail = () => {
  return useMutation({
    mutationFn: async (arg: SigninByEmailArg) => {
      const { email, password, session } = arg
      const providers = await getProviders()
      const provider = providers?.["credentials"]
      if (!provider) {
        throw new Error("Credentials provider not found")
      }
      try {
        const result = await signIn(provider.id, { redirect: false, email, password, session })

        if (result?.error) {
          // NOTE: This will always return 401, and the actual error message is in the error field,
          // so we need to parse it to check if it's password initialization required error or authentication error.
          if (result.status === 401) {
            const message = result.error ? JSON.parse(result.error) : {}
            if (message.code === 307) {
              throw new PasswordInitializationRequired(message.data)
            }
            throw new AuthenticationError("Sign in failed.")
          }
        }
      } catch (e) {
        if (e instanceof PasswordInitializationRequired) {
          throw e
        }
        // Throw same error independent of the reason.
        throw new AuthenticationError("Sign in failed.")
      }
    },
  })
}
