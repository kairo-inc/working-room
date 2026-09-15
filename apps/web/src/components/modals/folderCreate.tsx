import { Form } from "react-final-form"

import { DomainFileDescriptor } from "@wr/shared"

import { useNotification } from "../../contexts/notification"
import { useFileCreateFolder } from "../../hooks/trpc/file"
import { L } from "../../localization"
import { RectangleButton } from "../buttons/rectangleButton"
import { formStringRequired } from "../formSchema"
import { TextForm } from "../forms/textForm"
import { Modal, ModalBaseArgs, ModalProps, useModal } from "./modal"

type FormType = {
  name: string
}

type Args = ModalBaseArgs & {
  data: Pick<DomainFileDescriptor, "id">
}

type FolderCreateModalProps = ModalProps & Args

const validate = (values: FormType) => {
  const error = {} as { name?: string }

  const nameCheck = formStringRequired({ maxLength: 128 }).safeParse(values?.name ?? "")
  if (!nameCheck.success) {
    error.name = nameCheck.error.issues[0]?.message
  }
  return error
}

export const FolderCreateModal = ({ show, onClose, data, onReject, onResolve }: FolderCreateModalProps) => {
  const notify = useNotification()
  const { mutateAsync: createFolder, isPending } = useFileCreateFolder()
  const focusRef = (el: HTMLInputElement | null) => {
    if (el && show) {
      el.focus()
    }
  }
  return (
    <Modal show={show} onClose={onClose} title={L.modal.folderCreate.title}>
      <Form<FormType>
        validate={validate}
        onSubmit={async (values) => {
          try {
            await createFolder({ parentId: data.id, name: values.name })
            onClose?.()
            onResolve?.()
          } catch (error) {
            notify.error(L.modal.folderCreate.failed, error.message)
            onReject?.()
          }
        }}
        render={({ handleSubmit, hasValidationErrors }) => (
          <form onSubmit={handleSubmit} className="mt-4 flex flex-col text-sm">
            <TextForm
              formName="name"
              label={L.modal.folderCreate.folderName}
              placeholder={L.modal.folderCreate.folderNamePlaceholder}
              ref={focusRef}
            />
            <div className="mt-6 flex justify-end gap-4">
              <RectangleButton type="submit" loading={isPending} disabled={hasValidationErrors}>
                {L.modal.folderCreate.create}
              </RectangleButton>
              <RectangleButton onClick={onClose} disabled={isPending} variant="defaultOutline">
                {L.common.cancel}
              </RectangleButton>
            </div>
          </form>
        )}
      />
    </Modal>
  )
}

export const useFolderCreateModal = () => {
  return useModal<Args>(FolderCreateModal)
}
