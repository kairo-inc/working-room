import { useRouter } from "next/router"
import { Form } from "react-final-form"

import { UserRole } from "@wr/db"

import { useNotification } from "../../contexts/notification"
import { useTenantChangeUserRole } from "../../hooks/trpc/tenant"
import { L } from "../../localization"
import { AppUser } from "../../types/user"
import { RectangleButton } from "../buttons/rectangleButton"
import { formStringRequired } from "../formSchema"
import { SelectForm } from "../forms/selectForm"
import { Modal, ModalBaseArgs, ModalProps, useModal } from "./modal"

type FormType = {
  role: string
}

type Args = ModalBaseArgs & {
  data: Pick<AppUser, "id" | "name" | "role" | "email">
}

type UserChangeRoleModalProps = ModalProps & Args

const validate = (values: FormType, original: Args["data"]) => {
  const error = {} as { role?: string }

  const roleCheck = formStringRequired().safeParse(values?.role?.trim() ?? "")
  if (!roleCheck.success) {
    error.role = roleCheck.error.issues[0]?.message
  } else if (values.role.trim() === original.role) {
    error.role = L.modal.userChangeRole.roleUnchanged
  }
  return error
}

export const UserChangeRoleModal = ({ show, onClose, data, onReject, onResolve }: UserChangeRoleModalProps) => {
  const router = useRouter()
  const notify = useNotification()
  const { mutateAsync: changeUserRole, isPending } = useTenantChangeUserRole()
  const focusRef = (el: HTMLSelectElement | null) => {
    if (el && show) {
      el.focus()
    }
  }
  return (
    <Modal show={show} onClose={onClose} title={L.modal.userChangeRole.title}>
      <Form<FormType>
        validate={(values) => validate(values, data)}
        initialValues={{ role: data.role }}
        onSubmit={async (values) => {
          try {
            await changeUserRole({ userId: data.id, newRole: values.role?.trim() as UserRole })
            onClose?.()
            router.replace(router.asPath)
            onResolve?.()
          } catch (error) {
            notify.error(L.modal.userChangeRole.failed, error.message)
            onReject?.()
          }
        }}
        render={({ handleSubmit, hasValidationErrors }) => (
          <form onSubmit={handleSubmit} className="mt-4 flex flex-col text-sm">
            <SelectForm
              formName="role"
              label={L.modal.userChangeRole.userRole}
              options={
                [
                  { value: "admin", label: L.modal.userChangeRole.admin },
                  { value: "member", label: L.modal.userChangeRole.member },
                ] satisfies { value: UserRole; label: string }[]
              }
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

export const useUserChangeRoleModal = () => {
  return useModal<Args>(UserChangeRoleModal)
}
