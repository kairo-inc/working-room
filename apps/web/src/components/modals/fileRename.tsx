import { useRouter } from "next/router"
import { Form } from "react-final-form"

import { useNotification } from "../../contexts/notification"
import { useFileRename } from "../../hooks/trpc/file"
import { L } from "../../localization"
import { AppFileDescriptor } from "../../types/file"
import { RectangleButton } from "../buttons/rectangleButton"
import { formStringRequired } from "../formSchema"
import { TextForm } from "../forms/textForm"
import { Modal, ModalBaseArgs, ModalProps, useModal } from "./modal"

type FormType = {
  name: string
}

type Args = ModalBaseArgs & {
  data: Pick<AppFileDescriptor, "id" | "name">
}

type FileRenameModalProps = ModalProps & Args

const validate = (values: FormType, original: Args["data"]) => {
  const error = {} as { name?: string }
  const nameCheck = formStringRequired({ maxLength: 128 }).safeParse(values?.name?.trim() ?? "")
  if (!nameCheck.success) {
    error.name = nameCheck.error.issues[0]?.message
  } else if (values.name.trim() === original.name) {
    error.name = L.modal.fileRename.sameAsCurrentName
  }
  return error
}

export const FileRenameModal = ({ show, onClose, data, onReject, onResolve }: FileRenameModalProps) => {
  const router = useRouter()
  const notify = useNotification()
  const { mutateAsync: renameFile, isPending } = useFileRename()
  const focusRef = (el: HTMLInputElement | null) => {
    if (el && show) {
      el.focus()
    }
  }
  return (
    <Modal show={show} onClose={onClose} title={L.modal.fileRename.title}>
      <Form<FormType>
        validate={(values) => validate(values, data)}
        initialValues={{ name: data.name }}
        onSubmit={async (values) => {
          try {
            await renameFile({ descId: data.id, newName: values.name?.trim() })
            onClose?.()
            router.replace(router.asPath)
            onResolve?.()
          } catch (error) {
            notify.error(L.modal.fileRename.failed, error.message)
            onReject?.()
          }
        }}
        render={({ handleSubmit, hasValidationErrors }) => (
          <form onSubmit={handleSubmit} className="mt-4 flex flex-col text-sm">
            <TextForm
              formName="name"
              label={L.modal.fileRename.fileName}
              placeholder={L.modal.fileRename.fileNamePlaceholder}
              ref={focusRef}
            />
            <div className="mt-6 flex justify-end gap-4">
              <RectangleButton type="submit" loading={isPending} disabled={hasValidationErrors}>
                {L.common.save}
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

export const useFileRenameModal = () => {
  return useModal<Args>(FileRenameModal)
}
