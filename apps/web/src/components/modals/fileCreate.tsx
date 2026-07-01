import { useRouter } from "next/router"
import { Form } from "react-final-form"

import { DomainFileDescriptor } from "@wr/shared"

import { useNotification } from "../../contexts/notification"
import { useFileCreateEmpty } from "../../hooks/trpc/file"
import { L } from "../../localization"
import { Route } from "../../route"
import { RectangleButton } from "../buttons/rectangleButton"
import { formStringRequired } from "../formSchema"
import { SelectForm } from "../forms/selectForm"
import { TextForm } from "../forms/textForm"
import { Modal, ModalBaseArgs, ModalProps, useModal } from "./modal"

type FormType = {
  name: string
  mimeType: "text/markdown" | "text/plain"
}

type Args = ModalBaseArgs & {
  data: Pick<DomainFileDescriptor, "id">
}

type FileCreateModalProps = ModalProps & Args

const validate = (values: FormType) => {
  const error = {} as { name?: string }
  const nameCheck = formStringRequired({ maxLength: 128 }).safeParse(values?.name ?? "")
  if (!nameCheck.success) {
    error.name = nameCheck.error.issues[0]?.message
  }
  return error
}

export const FileCreateModal = ({ show, onClose, data, onReject, onResolve }: FileCreateModalProps) => {
  const router = useRouter()
  const notify = useNotification()
  const { mutateAsync: createEmpty, isPending } = useFileCreateEmpty()

  return (
    <Modal show={show} onClose={onClose} title={L.modal.fileCreate.title}>
      <Form<FormType>
        initialValues={{ mimeType: "text/markdown" }}
        validate={validate}
        onSubmit={async (values) => {
          try {
            const desc = await createEmpty({ parentId: data.id, name: values.name, mimeType: values.mimeType })
            if (!desc) return
            onClose?.()
            onResolve?.()
            router.push(Route.file(desc.id))
          } catch (error) {
            notify.error(L.modal.fileCreate.failed, error.message)
            onReject?.()
          }
        }}
        render={({ handleSubmit, hasValidationErrors }) => (
          <form onSubmit={handleSubmit} className="mt-4 flex flex-col gap-4 text-sm">
            <TextForm formName="name" label={L.modal.fileCreate.fileName} placeholder={L.modal.fileCreate.fileNamePlaceholder} />
            <SelectForm
              formName="mimeType"
              label={L.modal.fileCreate.fileType}
              options={[
                { value: "text/markdown", label: L.modal.fileCreate.markdown },
                { value: "text/plain", label: L.modal.fileCreate.text },
              ]}
            />
            <div className="mt-2 flex justify-end gap-4">
              <RectangleButton type="submit" loading={isPending} disabled={hasValidationErrors}>
                {L.modal.fileCreate.create}
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

export const useFileCreateModal = () => {
  return useModal<Args>(FileCreateModal)
}
