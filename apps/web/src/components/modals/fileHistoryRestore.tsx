import dayjs from "dayjs"
import { Timer } from "lucide-react"
import { useRouter } from "next/router"

import { useNotification } from "../../contexts/notification"
import { useFileRestoreHistory } from "../../hooks/trpc/file"
import { L } from "../../localization"
import { AppFileHistory } from "../../types/fileHistory"
import { RectangleButton } from "../buttons/rectangleButton"
import { Modal, ModalBaseArgs, ModalProps, useModal } from "./modal"

type Args = ModalBaseArgs & {
  data: Pick<AppFileHistory, "id" | "createdAt" | "operation">
}

type FileHistoryRestoreModalProps = ModalProps & Args

export const FileHistoryRestoreModal = ({ show, onClose, data, onReject, onResolve }: FileHistoryRestoreModalProps) => {
  const router = useRouter()
  const notify = useNotification()
  const { mutateAsync: restoreFileHistory, isPending } = useFileRestoreHistory()
  return (
    <Modal show={show} onClose={onClose} title={L.modal.fileHistoryRestore.title}>
      <div className="mt-4 text-sm">
        {L.modal.fileHistoryRestore.confirm}
        <div className="bg-muted my-2 flex items-center gap-2 truncate rounded-md px-3 py-2">
          <Timer />
          {`${data.operation} - `}
          {dayjs(data.createdAt).fromNow()}
        </div>
        {L.common.cannotBeUndone}
        <div className="mt-6 flex justify-end gap-4">
          <RectangleButton
            loading={isPending}
            variant="destructive"
            onClick={async () => {
              try {
                await restoreFileHistory({ historyId: data.id })
                onClose?.()
                router.replace(router.asPath)
                onResolve?.()
              } catch (error) {
                notify.error(L.modal.fileHistoryRestore.failed, error.message)
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

export const useFileHistoryRestoreModal = () => {
  return useModal<Args>(FileHistoryRestoreModal)
}
