import { UserKey } from "lucide-react"
import { useRouter } from "next/router"

import { useNotification } from "../../contexts/notification"
import { useAccessGroupEdit } from "../../hooks/trpc/accessGroup"
import { L } from "../../localization"
import { RectangleButton } from "../buttons/rectangleButton"
import { Modal, ModalBaseArgs, ModalProps, useModal } from "./modal"

type Args = ModalBaseArgs & {
  data: { accessGroupId: string; resourceId: string; resourceName: string }
}

type AccessGroupResourceDeleteModalProps = ModalProps & Args

export const AccessGroupResourceDeleteModal = ({ show, onClose, data, onReject, onResolve }: AccessGroupResourceDeleteModalProps) => {
  const router = useRouter()
  const notify = useNotification()
  const { mutateAsync: deleteAccessGroupResource, isPending } = useAccessGroupEdit()
  return (
    <Modal show={show} onClose={onClose} title={L.modal.accessGroupResourceDelete.title}>
      <div className="mt-4 text-sm">
        {L.modal.accessGroupResourceDelete.confirm}
        <div className="bg-muted my-2 flex items-center gap-2 truncate rounded-md px-3 py-2">
          <UserKey />
          {data.resourceName}
        </div>
        {L.common.cannotBeUndone}
        <div className="mt-6 flex justify-end gap-4">
          <RectangleButton
            loading={isPending}
            variant="destructive"
            onClick={async () => {
              try {
                await deleteAccessGroupResource({ id: data.accessGroupId, resourceIdsToRemove: [data.resourceId] })
                onClose?.()
                router.replace(router.asPath)
                onResolve?.()
              } catch (e) {
                notify.error(L.common.error, e.message)
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

export const useAccessGroupResourceDeleteModal = () => {
  return useModal<Args>(AccessGroupResourceDeleteModal)
}
