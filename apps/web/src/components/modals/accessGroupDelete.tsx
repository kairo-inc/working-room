import { UserKey } from "lucide-react"
import { useRouter } from "next/router"

import { useNotification } from "../../contexts/notification"
import { useAccessGroupDelete } from "../../hooks/trpc/accessGroup"
import { L } from "../../localization"
import { Route } from "../../route"
import { AppAccessGroup } from "../../types/accessGroup"
import { RectangleButton } from "../buttons/rectangleButton"
import { Modal, ModalBaseArgs, ModalProps, useModal } from "./modal"

type Args = ModalBaseArgs & {
  data: Pick<AppAccessGroup, "id" | "name">
}

type AccessGroupDeleteModalProps = ModalProps & Args

export const AccessGroupDeleteModal = ({ show, onClose, data, onReject, onResolve }: AccessGroupDeleteModalProps) => {
  const router = useRouter()
  const notify = useNotification()
  const { mutateAsync: deleteAccessGroup, isPending } = useAccessGroupDelete()
  return (
    <Modal show={show} onClose={onClose} title={L.modal.accessGroupDelete.title}>
      <div className="mt-4 text-sm">
        {L.modal.accessGroupDelete.confirm}
        <div className="bg-muted my-2 flex items-center gap-2 truncate rounded-md px-3 py-2">
          <UserKey />
          {data.name}
        </div>
        {L.common.cannotBeUndone}
        <div className="mt-6 flex justify-end gap-4">
          <RectangleButton
            loading={isPending}
            variant="destructive"
            onClick={async () => {
              try {
                await deleteAccessGroup({ id: data.id })
                onClose?.()
                router.push(Route.settingAccessGroup())
                onResolve?.()
              } catch (e) {
                notify.error(L.modal.accessGroupDelete.failed, e.message)
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

export const useAccessGroupDeleteModal = () => {
  return useModal<Args>(AccessGroupDeleteModal)
}
