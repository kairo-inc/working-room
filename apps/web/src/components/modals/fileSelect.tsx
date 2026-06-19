import clsx from "clsx"
import { ArrowLeft } from "lucide-react"
import { useState } from "react"

import { useFileGetList, useFileGetParentOrRoot } from "../../hooks/trpc/file"
import { L } from "../../localization"
import { AppFileDescriptor } from "../../types/file"
import { RectangleButton } from "../buttons/rectangleButton"
import { FileIconSm } from "../file/item"
import { LoadingIndicator } from "../indicator"
import { Modal, ModalProps, useModal } from "./modal"

type Args = {
  initialParentFolderId?: string
  onFileSelected?: (file: AppFileDescriptor) => void
}

type FileSelectModalProps = ModalProps & Args

const FileList = ({
  files,
  selectedFileId,
  grandParent,
  onRowClick,
  onRowDoubleClick,
  onBackClick,
  isLoading,
}: {
  files: AppFileDescriptor[]
  selectedFileId?: string
  grandParent?: AppFileDescriptor
  onRowClick: (file: AppFileDescriptor) => void
  onRowDoubleClick: (file: AppFileDescriptor) => void
  onBackClick: (file: AppFileDescriptor) => void
  isLoading?: boolean
}) => {
  const hasFiles = files.length > 0
  const headerClassName = "text-sm font-normal text-muted-foreground p-2"
  const rowClassName = "text-sm cursor-pointer p-2 hover:bg-muted border-t border-border first:border-t-0"
  const selectedRowClassName = "!bg-primary/20 !text-primary"
  const notDirectoryRowClassName = "cursor-not-allowed text-sm text-muted-foreground p-2 border-t border-border first:border-t-0"
  const placeholderClassName = "text-sm text-muted-foreground p-2 border-t border-border first:border-t-0 text-center"
  return (
    <div className="grid">
      <div className={clsx(headerClassName)}>{L.modal.fileSelect.name}</div>
      {grandParent && !grandParent.isRoot && (
        <div className={clsx(rowClassName)} onClick={() => onBackClick(grandParent)}>
          <div className="flex items-center gap-2">
            <ArrowLeft className="size-4" />
            {L.modal.fileSelect.back}
          </div>
        </div>
      )}
      {files.map((file) => (
        <div
          key={file.id}
          className={clsx(file.isDirectory ? rowClassName : notDirectoryRowClassName, file.id === selectedFileId && selectedRowClassName)}
          onClick={() => {
            if (file.isDirectory) onRowClick(file)
          }}
          onDoubleClick={() => {
            if (file.isDirectory) onRowDoubleClick(file)
          }}
        >
          <div className="flex items-center gap-2">
            <FileIconSm type={file.mimeType} />
            {file.name}
          </div>
        </div>
      ))}
      {!hasFiles && <div className={placeholderClassName}>{L.modal.fileSelect.noFiles}</div>}
      {isLoading && (
        <div className="flex items-center justify-center p-4">
          <LoadingIndicator />
        </div>
      )}
    </div>
  )
}

export const FileSelectModal = ({ show, onClose, onFileSelected, initialParentFolderId }: FileSelectModalProps) => {
  const [selectedFile, setSelectedFile] = useState<AppFileDescriptor | null>(null)
  const [queryArgs, setQueryArgs] = useState<Parameters<typeof useFileGetList>[0]>({ parentId: initialParentFolderId })

  const { data: grandParent, isPending: isGrandParentPending } = useFileGetParentOrRoot(queryArgs?.parentId)
  const { data, isPending: isFilesPending } = useFileGetList(queryArgs)

  const isPending = isFilesPending || isGrandParentPending
  const files = data?.pages.flatMap((page) => page.data) ?? []

  return (
    <Modal show={show} onClose={onClose} title={L.modal.fileSelect.title} containerClassName="w-[clamp(30vw,600px,80vw)] h-1/2">
      <div className="mt-4 flex-1 text-sm">
        <FileList
          isLoading={isPending}
          files={files}
          grandParent={grandParent}
          selectedFileId={selectedFile?.id}
          onRowClick={(file) => setSelectedFile(file)}
          onRowDoubleClick={(file) => {
            setQueryArgs({ parentId: file.id })
            setSelectedFile(null)
          }}
          onBackClick={(file) => {
            setQueryArgs({ parentId: file.parentId })
            setSelectedFile(null)
          }}
        />
      </div>
      <div className="flex justify-end gap-4">
        <RectangleButton
          disabled={!selectedFile}
          onClick={() => {
            onFileSelected?.(selectedFile!)
            onClose?.()
          }}
        >
          {L.modal.fileSelect.select}
        </RectangleButton>
        <RectangleButton variant="defaultOutline" onClick={onClose}>
          {L.modal.fileSelect.close}
        </RectangleButton>
      </div>
    </Modal>
  )
}

export const useFileSelectModal = () => {
  return useModal<Args>(FileSelectModal)
}
