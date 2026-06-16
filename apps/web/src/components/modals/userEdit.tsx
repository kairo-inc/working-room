import { useRouter } from "next/router"
import { Form } from "react-final-form"

import { useNotification } from "../../contexts/notification"
import { useUserEdit } from "../../hooks/trpc/user"
import { L } from "../../localization"
import { AppUserSetting } from "../../types/user"
import { RectangleButton } from "../buttons/rectangleButton"
import { formStringRequired } from "../formSchema"
import { TextForm } from "../forms/textForm"
import { Modal, ModalBaseArgs, ModalProps, useModal } from "./modal"

type FormType = {
  name?: string
}

type Args = ModalBaseArgs & {
  data: Pick<AppUserSetting, "id" | "name">
}

type UserEditModalProps = ModalProps & Args

const validate = (values: FormType, original: Args["data"]) => {
  const error = {} as { name?: string; language?: string }

  const nameCheck = formStringRequired().safeParse(values?.name?.trim() ?? "")
  if (!nameCheck.success) {
    error.name = nameCheck.error.issues[0]?.message
  } else if (values.name?.trim() === original.name) {
    error.name = "Name is unchanged"
  }

  return error
}

export const UserEditModal = ({ show, onClose, data, onReject, onResolve }: UserEditModalProps) => {
  const router = useRouter()
  const notify = useNotification()
  const { mutateAsync: editUser, isPending } = useUserEdit()
  const focusRef = (el: HTMLInputElement | null) => {
    if (el && show) {
      el.focus()
    }
  }
  return (
    <Modal show={show} onClose={onClose} title={L.modal.userEdit.title}>
      <Form<FormType>
        validate={(values) => validate(values, data)}
        initialValues={{ name: data.name }}
        onSubmit={async (values) => {
          try {
            await editUser({ name: values.name?.trim() })
            onClose?.()
            router.replace(router.asPath)
            onResolve?.()
          } catch (error) {
            notify.error(L.modal.userEdit.failed, error.message)
            onReject?.()
          }
        }}
        render={({ handleSubmit, hasValidationErrors }) => (
          <form onSubmit={handleSubmit} className="mt-4 flex flex-col text-sm">
            <TextForm formName="name" label={L.modal.userEdit.userName} placeholder={L.modal.userEdit.userNamePlaceholder} ref={focusRef} />
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

export const useUserEditModal = () => {
  return useModal<Args>(UserEditModal)
}
