import { User } from "lucide-react"
import { useRouter } from "next/router"

import { useNotification } from "../../contexts/notification"
import { useTenantDeleteUser } from "../../hooks/trpc/tenant"
import { L } from "../../localization"
import { AppUser } from "../../types/user"
import { RectangleButton } from "../buttons/rectangleButton"
import { Modal, ModalBaseArgs, ModalProps, useModal } from "./modal"

type FormType = {
  name: string
}

type Args = ModalBaseArgs & {
  data: Pick<AppUser, "id" | "name" | "email">
}

type UserDeleteModalProps = ModalProps & Args

export const UserDeleteModal = ({ show, onClose, data, onReject, onResolve }: UserDeleteModalProps) => {
  const router = useRouter()
  const notify = useNotification()
  const { mutateAsync: deleteUser, isPending } = useTenantDeleteUser()

  return (
    <Modal show={show} onClose={onClose} title={L.modal.userDelete.title}>
      <div className="mt-4 text-sm">
        {L.modal.userDelete.confirm}
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
                await deleteUser({ userId: data.id })
                onClose?.()
                router.replace(router.asPath)
                onResolve?.()
              } catch (error) {
                notify.error(L.modal.userDelete.failed, error.message)
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

export const useUserDeleteModal = () => {
  return useModal<Args>(UserDeleteModal)
}
