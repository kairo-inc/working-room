import { Blend } from "lucide-react"
import { useRouter } from "next/router"

import { useNotification } from "../../contexts/notification"
import { useAgentDelete } from "../../hooks/trpc/agent"
import { L } from "../../localization"
import { AppAgent } from "../../types/agent"
import { RectangleButton } from "../buttons/rectangleButton"
import { Modal, ModalBaseArgs, ModalProps, useModal } from "./modal"

type Args = ModalBaseArgs & {
  data: Pick<AppAgent, "id" | "name">
}

type AgentDeleteModalProps = ModalProps & Args

export const AgentDeleteModal = ({ show, onClose, data, onReject, onResolve }: AgentDeleteModalProps) => {
  const router = useRouter()
  const notify = useNotification()
  const { mutateAsync: deleteAgent, isPending } = useAgentDelete()

  return (
    <Modal show={show} onClose={onClose} title={L.modal.agentDelete.title}>
      <div className="mt-4 text-sm">
        {L.modal.agentDelete.confirm.replace("{0}", data.name)}
        <div className="bg-muted my-2 flex items-center gap-2 truncate rounded-md px-3 py-2">
          <Blend />
          {data.name}
        </div>
        {L.common.cannotBeUndone}
        <div className="mt-6 flex justify-end gap-4">
          <RectangleButton
            loading={isPending}
            variant="destructive"
            onClick={async () => {
              try {
                await deleteAgent({ id: data.id })
                onClose?.()
                router.replace(router.asPath)
                onResolve?.()
              } catch (error) {
                notify.error(L.modal.agentDelete.failed, error.message)
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

export const useAgentDeleteModal = () => {
  return useModal<Args>(AgentDeleteModal)
}
