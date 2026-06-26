import { useRouter } from "next/router"
import { Form } from "react-final-form"

import { DomainFileDescriptor } from "@wr/shared"

import { useNotification } from "../../contexts/notification"
import { useFileCreateDirectory } from "../../hooks/trpc/file"
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

type DirectoryCreateModalProps = ModalProps & Args

const validate = (values: FormType) => {
  const error = {} as { name?: string }

  const nameCheck = formStringRequired({ maxLength: 128 }).safeParse(values?.name ?? "")
  if (!nameCheck.success) {
    error.name = nameCheck.error.issues[0]?.message
  }
  return error
}

export const DirectoryCreateModal = ({ show, onClose, data, onReject, onResolve }: DirectoryCreateModalProps) => {
  const router = useRouter()
  const notify = useNotification()
  const { mutateAsync: createDirectory, isPending } = useFileCreateDirectory()
  const focusRef = (el: HTMLInputElement | null) => {
    if (el && show) {
      el.focus()
    }
  }
  return (
    <Modal show={show} onClose={onClose} title={L.modal.directoryCreate.title}>
      <Form<FormType>
        validate={validate}
        onSubmit={async (values) => {
          try {
            await createDirectory({ parentId: data.id, name: values.name })
            onClose?.()
            router.replace(router.asPath)
            onResolve?.()
          } catch (error) {
            notify.error(L.modal.directoryCreate.failed, error.message)
            onReject?.()
          }
        }}
        render={({ handleSubmit, hasValidationErrors }) => (
          <form onSubmit={handleSubmit} className="mt-4 flex flex-col text-sm">
            <TextForm
              formName="name"
              label={L.modal.directoryCreate.directoryName}
              placeholder={L.modal.directoryCreate.directoryNamePlaceholder}
              ref={focusRef}
            />
            <div className="mt-6 flex justify-end gap-4">
              <RectangleButton type="submit" loading={isPending} disabled={hasValidationErrors}>
                {L.modal.directoryCreate.create}
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

export const useDirectoryCreateModal = () => {
  return useModal<Args>(DirectoryCreateModal)
}
