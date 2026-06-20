import { useRouter } from "next/router"
import { Form } from "react-final-form"

import { useNotification } from "../../contexts/notification"
import { useTenantInviteUser } from "../../hooks/trpc/tenant"
import { L } from "../../localization"
import { RectangleButton } from "../buttons/rectangleButton"
import { formStringRequired } from "../formSchema"
import { TextForm } from "../forms/textForm"
import { downloadFile } from "../utils/download"
import { Modal, ModalBaseArgs, ModalProps, useModal } from "./modal"

type FormType = {
  email: string
}

type Args = ModalBaseArgs & {}

type UserInviteModalProps = ModalProps & Args

const validate = (values: FormType) => {
  const error = {} as { email?: string }
  const emailCheck = formStringRequired({ maxLength: 128 }).safeParse(values?.email ?? "")
  const hasAtSign = values?.email?.includes("@")
  const hasDotAfterAtSign = values?.email?.split("@")[1]?.includes(".")
  const notEndWithDot = values?.email?.endsWith(".") === false
  const hasSpaces = values?.email?.includes(" ")
  if (!emailCheck.success) {
    error.email = emailCheck.error.issues[0]?.message
  } else {
    if (!hasAtSign || !hasDotAfterAtSign || !notEndWithDot || hasSpaces) {
      error.email = L.common.validation.invalidEmail
    }
  }
  return error
}

export const UserInviteModal = ({ show, onClose, onReject, onResolve }: UserInviteModalProps) => {
  const router = useRouter()
  const notify = useNotification()
  const { mutateAsync: inviteUser, isPending } = useTenantInviteUser()
  const focusRef = (el: HTMLInputElement | null) => {
    if (el && show) {
      el.focus()
    }
  }
  return (
    <Modal show={show} onClose={onClose} title={L.modal.userInvite.title}>
      <Form<FormType>
        validate={validate}
        onSubmit={async (values) => {
          try {
            const result = await inviteUser({ email: values.email })
            if (result.localAuthResult) {
              downloadFile("invitation.txt", `Temporary password for ${values.email}: ${result.localAuthResult.initialPassword}`)
            }

            onClose?.()
            router.replace(router.asPath)
            onResolve?.()
          } catch (error) {
            notify.error(L.modal.userInvite.failed, error.message)
            onReject?.()
          }
        }}
        render={({ handleSubmit, hasValidationErrors }) => (
          <form onSubmit={handleSubmit} className="mt-4 flex flex-col text-sm">
            <TextForm
              formName="email"
              label={L.modal.userInvite.emailLabel}
              placeholder={L.modal.userInvite.emailPlaceholder}
              ref={focusRef}
            />
            <div className="mt-6 flex justify-end gap-4">
              <RectangleButton type="submit" loading={isPending} disabled={hasValidationErrors}>
                {L.modal.userInvite.invite}
              </RectangleButton>
              <RectangleButton onClick={onClose} disabled={isPending} variant="defaultOutline">
                {L.common.cancel}
              </RectangleButton>
            </div>
          </form>
        )}
      />
    </Modal>
  )
}

export const useUserInviteModal = () => {
  return useModal<Args>(UserInviteModal)
}
