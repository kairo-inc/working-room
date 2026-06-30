import { useRouter } from "next/router"
import { Form } from "react-final-form"

import { AiVendorName, aiVendorNames } from "@wr/shared"

import { useNotification } from "../../contexts/notification"
import { useTenantEditAiVendor } from "../../hooks/trpc/tenant"
import { L } from "../../localization"
import { AppTenant } from "../../types/tenant"
import { RectangleButton } from "../buttons/rectangleButton"
import { SelectForm } from "../forms/selectForm"
import { Modal, ModalBaseArgs, ModalProps, useModal } from "./modal"

const AUTO_VALUE = "__auto__"

type FormType = {
  aiVendor: AiVendorName | typeof AUTO_VALUE
}

type Args = ModalBaseArgs & {
  data: Pick<AppTenant, "id" | "aiVendor">
}

type TenantAiVendorEditModalProps = ModalProps & Args

export const TenantAiVendorEditModal = ({ show, onClose, data, onReject, onResolve }: TenantAiVendorEditModalProps) => {
  const router = useRouter()
  const notify = useNotification()
  const { mutateAsync: editAiVendor, isPending } = useTenantEditAiVendor()

  const options = [
    { value: AUTO_VALUE, label: L.modal.tenantAiVendorEdit.auto },
    ...aiVendorNames.map((v) => ({ value: v, label: L.modal.tenantAiVendorEdit[v] })),
  ]

  return (
    <Modal show={show} onClose={onClose} title={L.modal.tenantAiVendorEdit.title}>
      <Form<FormType>
        initialValues={{ aiVendor: data.aiVendor ?? AUTO_VALUE }}
        onSubmit={async (values) => {
          try {
            const aiVendor = values.aiVendor === AUTO_VALUE ? null : (values.aiVendor as AiVendorName)
            await editAiVendor({ aiVendor })
            onClose?.()
            router.replace(router.asPath)
            onResolve?.()
          } catch (error) {
            notify.error(L.modal.tenantAiVendorEdit.failed, error.message)
            onReject?.()
          }
        }}
        render={({ handleSubmit }) => (
          <form onSubmit={handleSubmit} className="mt-4 flex flex-col text-sm">
            <SelectForm formName="aiVendor" label={L.modal.tenantAiVendorEdit.vendor} options={options} />
            <div className="mt-6 flex justify-end gap-4">
              <RectangleButton type="submit" loading={isPending}>
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

export const useTenantAiVendorEditModal = () => {
  return useModal<Args>(TenantAiVendorEditModal)
}
