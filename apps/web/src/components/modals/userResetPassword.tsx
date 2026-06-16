import { User } from "lucide-react"
import { useRouter } from "next/router"

import { useNotification } from "../../contexts/notification"
import { useTenantResetUserPassword } from "../../hooks/trpc/tenant"
import { L } from "../../localization"
import { AppUser } from "../../types/user"
import { RectangleButton } from "../buttons/rectangleButton"
import { downloadFile } from "../utils/download"
import { Modal, ModalBaseArgs, ModalProps, useModal } from "./modal"

type Args = ModalBaseArgs & {
  data: Pick<AppUser, "id" | "name" | "email">
}

type UserResetPasswordModalProps = ModalProps & Args

export const UserResetPasswordModal = ({ show, onClose, data, onReject, onResolve }: UserResetPasswordModalProps) => {
  const router = useRouter()
  const notify = useNotification()
  const { mutateAsync: resetPassword, isPending } = useTenantResetUserPassword()

  return (
    <Modal show={show} onClose={onClose} title={L.modal.userResetPassword.title}>
      <div className="mt-4 text-sm">
        {L.modal.userResetPassword.confirm}
        <div className="bg-muted my-2 flex items-center gap-2 truncate rounded-md px-3 py-2">
          <User />
          {data.email}
        </div>
        {L.common.cannotBeUndone}
        <div className="mt-6 flex justify-end gap-4">
          <RectangleButton
            loading={isPending}
            variant="destructive"
            onClick={async () => {
              try {
                const result = await resetPassword({ userId: data.id })
                if (result.localAuthResult) {
                  const { email, newPassword } = result.localAuthResult
                  downloadFile(`password-reset-${email}.txt`, `Email: ${email}\nNew Password: ${newPassword}`)
                }

                onClose?.()
                router.replace(router.asPath)
                onResolve?.()
              } catch (error) {
                notify.error(L.modal.userResetPassword.failed, error.message)
                onReject?.()
              }
            }}
          >
            {L.common.ok}
          </RectangleButton>
          <RectangleButton onClick={onClose} disabled={isPending} variant="defaultOutline">
            {L.common.cancel}
          </RectangleButton>
        </div>
      </div>
    </Modal>
  )
}

export const useUserResetPasswordModal = () => {
  return useModal<Args>(UserResetPasswordModal)
}
