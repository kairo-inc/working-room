import { useRouter } from "next/router"

import { useNotification } from "../../contexts/notification"
import { useFileDeleteMany } from "../../hooks/trpc/file"
import { L } from "../../localization"
import { AppFileDescriptor } from "../../types/file"
import { RectangleButton } from "../buttons/rectangleButton"
import { FileIconSm } from "../file/item"
import { Modal, ModalBaseArgs, ModalProps, useModal } from "./modal"

type Args = ModalBaseArgs & {
  data: Pick<AppFileDescriptor, "id" | "name" | "mimeType">[]
}

type FilesDeleteModalProps = ModalProps & Args

export const FilesDeleteModal = ({ show, onClose, data, onReject, onResolve }: FilesDeleteModalProps) => {
  const router = useRouter()
  const notify = useNotification()
  const { mutateAsync: deleteFiles, isPending } = useFileDeleteMany()
  return (
    <Modal show={show} onClose={onClose} title={L.modal.fileDelete.title}>
      <div className="mt-4 text-sm">
        {data.length === 1 ? L.modal.fileDelete.confirmSingular : L.modal.fileDelete.confirmPlural}
        <div className="bg-muted my-2 flex flex-col items-start gap-2 truncate rounded-md px-3 py-2">
          {data.map((file) => (
            <div key={file.id} className="flex items-center gap-2">
              <FileIconSm type={file.mimeType} />
              {file.name}
            </div>
          ))}
        </div>
        {L.common.cannotBeUndone}
        <div className="mt-6 flex justify-end gap-4">
          <RectangleButton
            loading={isPending}
            variant="destructive"
            onClick={async () => {
              try {
                await deleteFiles({ ids: data.map((file) => file.id) })
                onClose?.()
                router.replace(router.asPath)
                onResolve?.()
              } catch (error) {
                notify.error(L.modal.fileDelete.failed, error.message)
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

export const useFileDeleteModal = () => {
  return useModal<Args>(FilesDeleteModal)
}
