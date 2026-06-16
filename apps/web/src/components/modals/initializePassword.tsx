import { useRouter } from "next/router"
import { Form } from "react-final-form"

import { useNotification } from "../../contexts/notification"
import { useAuthSigninByEmail } from "../../hooks/api/auth"
import { useAuthInitiatePassword } from "../../hooks/trpc/auth"
import { L } from "../../localization"
import { RectangleButton } from "../buttons/rectangleButton"
import { formPasswordSchema } from "../formSchema"
import { TextForm } from "../forms/textForm"
import { Modal, ModalBaseArgs, ModalProps, useModal } from "./modal"

type FormData = {
  password: string
  confirmPassword: string
}

type Args = ModalBaseArgs & {
  sessionCode: string
  email: string
}

type InitializePasswordModalProps = ModalProps & Args

const validate = (values: FormData) => {
  const error = {} as { password?: string; confirmPassword?: string }

  const passwordCheck = formPasswordSchema().safeParse(values.password ?? "")
  if (!passwordCheck.success) {
    error.password = passwordCheck.error.issues[0]?.message
  }

  const confirmPasswordCheck = formPasswordSchema().safeParse(values.confirmPassword ?? "")
  if (!confirmPasswordCheck.success) {
    error.confirmPassword = confirmPasswordCheck.error.issues[0]?.message
  } else if (values.password !== values.confirmPassword) {
    error.confirmPassword = L.modal.initializePassword.passwordMismatch
  }

  return error
}

export const InitializePasswordModal = ({ show, onClose, sessionCode, email, onReject, onResolve }: InitializePasswordModalProps) => {
  const router = useRouter()
  const notify = useNotification()
  const { mutateAsync: initiatePassword } = useAuthInitiatePassword()
  const { mutateAsync: signinByEmail } = useAuthSigninByEmail()
  return (
    <Modal show={show} onClose={onClose} title={L.modal.initializePassword.title}>
      <Form<FormData>
        validate={validate}
        onSubmit={async ({ password }) => {
          try {
            await initiatePassword({ email, newPassword: password, sessionCode })
            await signinByEmail({ email, password })
            router.reload()
            onResolve?.()
          } catch (e) {
            notify.error(L.modal.initializePassword.error, e.message)
            onReject?.()
          }
        }}
        render={({ handleSubmit, submitting, hasValidationErrors }) => (
          <form onSubmit={handleSubmit} className="flex flex-col gap-3">
            <TextForm
              formName="password"
              label={L.modal.initializePassword.password}
              placeholder={L.modal.initializePassword.passwordPlaceholder}
              autoComplete="new-password"
              type="password"
            />
            <TextForm
              formName="confirmPassword"
              label={L.modal.initializePassword.confirmPassword}
              placeholder={L.modal.initializePassword.confirmPasswordPlaceholder}
              autoComplete="new-password"
              type="password"
            />
            <div className="mt-4 flex justify-end">
              <RectangleButton type="submit" loading={submitting} disabled={hasValidationErrors}>
                {L.modal.initializePassword.initialize}
              </RectangleButton>
            </div>
          </form>
        )}
      />
    </Modal>
  )
}

export const useInitializePasswordModal = () => {
  return useModal<Args>(InitializePasswordModal)
}
