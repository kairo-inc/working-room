import { useRouter } from "next/router"

import { EntityFileDescriptor } from "@wr/db"

import { useNotification } from "../../contexts/notification"
import { useChatDelete } from "../../hooks/trpc/chat"
import { L } from "../../localization"
import { RectangleButton } from "../buttons/rectangleButton"
import { Modal, ModalBaseArgs, ModalProps, useModal } from "./modal"

type Args = ModalBaseArgs & {
  data: Pick<EntityFileDescriptor, "id">
}

type ChatDeleteModalProps = ModalProps & Args

export const ChatDeleteModal = ({ show, onClose, data, onReject, onResolve }: ChatDeleteModalProps) => {
  const router = useRouter()
  const notify = useNotification()
  const { mutateAsync: deleteChat, isPending } = useChatDelete()
  return (
    <Modal show={show} onClose={onClose} title={L.modal.chatDelete.title}>
      <div className="mt-4 text-sm">
        {L.modal.chatDelete.confirm}
        <br />
        {L.common.cannotBeUndone}
        <div className="mt-6 flex justify-end gap-4">
          <RectangleButton
            loading={isPending}
            variant="destructive"
            onClick={async () => {
              try {
                await deleteChat({ id: data.id })
                onClose?.()
                router.replace(router.asPath)
                onResolve?.()
              } catch (e) {
                notify.error(L.modal.chatDelete.error, e.message)
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

export const useChatDeleteModal = () => {
  return useModal<Args>(ChatDeleteModal)
}
