import { useRouter } from "next/router"
import { Form } from "react-final-form"
import { z } from "zod"

import { useNotification } from "../../contexts/notification"
import { useAccessGroupCreate } from "../../hooks/trpc/accessGroup"
import { L } from "../../localization"
import { AppFileDescriptorEssential } from "../../types/file"
import { RectangleButton } from "../buttons/rectangleButton"
import { formStringRequired } from "../formSchema"
import { TextAreaForm } from "../forms/textAreaForm"
import { TextForm } from "../forms/textForm"
import { Modal, ModalBaseArgs, ModalProps, useModal } from "./modal"

type FormData = {
  name: string
  description?: string
}

type Args = ModalBaseArgs & {
  data: Pick<AppFileDescriptorEssential, "id" | "name">
}

type AccessGroupCreateModalProps = ModalProps & Args

const validate = (values: FormData) => {
  const errors: Partial<Record<keyof FormData, string>> = {}

  const nameCheck = formStringRequired({ maxLength: 128 }).safeParse(values?.name ?? "")
  if (!nameCheck.success) {
    errors.name = nameCheck.error.issues[0]?.message
  }

  if (values.description !== undefined && values.description !== null) {
    const descriptionCheck = z.string().max(1024, L.common.validation.maxLength).safeParse(values.description)
    if (!descriptionCheck.success) {
      errors.description = descriptionCheck.error.issues[0]?.message
    }
  }

  return errors
}

export const AccessGroupCreateModal = ({ show, data, onClose, onReject, onResolve }: AccessGroupCreateModalProps) => {
  const router = useRouter()
  const notify = useNotification()
  const { mutateAsync: createAccessGroup, isPending } = useAccessGroupCreate()
  return (
    <Modal show={show} onClose={onClose} title={L.modal.accessGroupCreate.title}>
      <Form<FormData>
        validate={validate}
        onSubmit={async (values) => {
          try {
            const accessGroup = await createAccessGroup({
              name: values.name,
              description: values.description,
              read: true,
              write: true,
              resourceId: data.id,
            })
            notify.info(L.modal.accessGroupCreate.success, L.modal.accessGroupCreate.successMessage.replace("{0}", values.name))
            onClose?.()
            router.replace(router.asPath)
            onResolve?.()
          } catch (e) {
            notify.error(L.modal.accessGroupCreate.failed, e.message)
          }
        }}
        render={({ handleSubmit, hasValidationErrors }) => (
          <form onSubmit={handleSubmit} className="mt-4 flex flex-col text-sm">
            <div className="text-muted-foreground mb-4">
              {L.modal.accessGroupCreate.description.replace("{0}", data.name)}
              <br /> {L.modal.accessGroupCreate.permissionNote}
            </div>
            <div className="flex flex-col gap-2">
              <TextForm
                formName="name"
                label={L.modal.accessGroupCreate.groupName}
                placeholder={L.modal.accessGroupCreate.groupNamePlaceholder}
                required
              />
              <TextAreaForm
                formName="description"
                label={L.modal.accessGroupCreate.descriptionLabel}
                placeholder={L.modal.accessGroupCreate.descriptionPlaceholder}
              />
            </div>
            <div className="mt-6 flex justify-end gap-4">
              <RectangleButton type="submit" loading={isPending} disabled={hasValidationErrors}>
                {L.common.ok}
              </RectangleButton>
              <RectangleButton variant="defaultOutline" onClick={onClose} disabled={isPending}>
                {L.common.cancel}
              </RectangleButton>
            </div>
          </form>
        )}
      />
    </Modal>
  )
}

export const useAccessGroupCreateModal = () => {
  return useModal<Args>(AccessGroupCreateModal)
}
