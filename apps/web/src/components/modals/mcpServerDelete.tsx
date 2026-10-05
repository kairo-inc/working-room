import { useRouter } from "next/router"

import { useNotification } from "../../contexts/notification"
import { useMcpServerDelete } from "../../hooks/trpc/mcpServer"
import { L } from "../../localization"
import { AppMcpServer } from "../../types/mcpServer"
import { RectangleButton } from "../buttons/rectangleButton"
import { Modal, ModalBaseArgs, ModalProps, useModal } from "./modal"

type Args = ModalBaseArgs & {
  data: Pick<AppMcpServer, "id" | "name">
}

type McpServerDeleteModalProps = ModalProps & Args

export const McpServerDeleteModal = ({ show, onClose, data, onReject, onResolve }: McpServerDeleteModalProps) => {
  const router = useRouter()
  const notify = useNotification()
  const { mutateAsync: deleteMcpServer, isPending } = useMcpServerDelete()

  return (
    <Modal show={show} onClose={onClose} title={L.modal.mcpServerDelete.title}>
      <div className="mt-4 text-sm">
        {L.modal.mcpServerDelete.confirm.replace("{0}", data.name)}
        <br />
        {L.common.cannotBeUndone}
        <div className="mt-6 flex justify-end gap-4">
          <RectangleButton
            loading={isPending}
            variant="destructive"
            onClick={async () => {
              try {
                await deleteMcpServer({ id: data.id })
                onClose?.()
                router.replace(router.asPath)
                onResolve?.()
              } catch (error) {
                notify.error(L.modal.mcpServerDelete.failed, error.message)
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

export const useMcpServerDeleteModal = () => {
  return useModal<Args>(McpServerDeleteModal)
}
