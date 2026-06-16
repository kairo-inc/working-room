import { useRouter } from "next/router"
import { Form } from "react-final-form"

import { useNotification } from "../../contexts/notification"
import { useTenantEdit } from "../../hooks/trpc/tenant"
import { L } from "../../localization"
import { AppTenant } from "../../types/tenant"
import { RectangleButton } from "../buttons/rectangleButton"
import { formStringRequired } from "../formSchema"
import { TextForm } from "../forms/textForm"
import { Modal, ModalBaseArgs, ModalProps, useModal } from "./modal"

type FormType = {
  name: string
}

type Args = ModalBaseArgs & {
  data: Pick<AppTenant, "id" | "name">
}

type TenantEditModalProps = ModalProps & Args

const validate = (values: FormType, original: Args["data"]) => {
  const error = {} as { name?: string }

  const nameCheck = formStringRequired().safeParse(values?.name?.trim() ?? "")
  if (!nameCheck.success) {
    error.name = nameCheck.error.issues[0]?.message
  } else if (values.name.trim() === original.name) {
    error.name = L.modal.tenantEdit.nameUnchanged
  }
  return error
}

export const TenantEditModal = ({ show, onClose, data, onReject, onResolve }: TenantEditModalProps) => {
  const router = useRouter()
  const notify = useNotification()
  const { mutateAsync: editTenant, isPending } = useTenantEdit()
  const focusRef = (el: HTMLInputElement | null) => {
    if (el && show) {
      el.focus()
    }
  }
  return (
    <Modal show={show} onClose={onClose} title={L.modal.tenantEdit.title}>
      <Form<FormType>
        validate={(values) => validate(values, data)}
        initialValues={{ name: data.name }}
        onSubmit={async (values) => {
          try {
            await editTenant({ name: values.name?.trim() })
            onClose?.()
            router.replace(router.asPath)
            onResolve?.()
          } catch (error) {
            notify.error(L.modal.tenantEdit.failed, error.message)
            onReject?.()
          }
        }}
        render={({ handleSubmit, hasValidationErrors }) => (
          <form onSubmit={handleSubmit} className="mt-4 flex flex-col text-sm">
            <TextForm
              formName="name"
              label={L.modal.tenantEdit.tenantName}
              placeholder={L.modal.tenantEdit.tenantNamePlaceholder}
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

export const useTenantEditModal = () => {
  return useModal<Args>(TenantEditModal)
}
