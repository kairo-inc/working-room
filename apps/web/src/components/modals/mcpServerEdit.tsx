import { useRouter } from "next/router"
import { Form } from "react-final-form"

import { useNotification } from "../../contexts/notification"
import { useMcpServerCreate, useMcpServerEdit } from "../../hooks/trpc/mcpServer"
import { L } from "../../localization"
import { AppMcpServer } from "../../types/mcpServer"
import { RectangleButton } from "../buttons/rectangleButton"
import { formStringRequired } from "../formSchema"
import { TextForm } from "../forms/textForm"
import { ToggleForm } from "../forms/toggleForm"
import { VerticalAlignedItems } from "../layout/verticalAlignedItems"
import { Modal, ModalBaseArgs, ModalProps, useModal } from "./modal"

type FormType = {
  name?: string
  url?: string
  accessToken?: string
  removeAccessToken?: boolean
}

type Args = ModalBaseArgs & {
  // Edits the server when given, otherwise adds a new one.
  data?: Pick<AppMcpServer, "id" | "name" | "url" | "hasAccessToken">
}

type McpServerEditModalProps = ModalProps & Args

const validate = (values: FormType) => {
  const error = {} as { name?: string; url?: string }

  const nameCheck = formStringRequired({ maxLength: 32 }).safeParse(values?.name?.trim() ?? "")
  if (!nameCheck.success) {
    error.name = nameCheck.error.issues[0]?.message
  } else if (!/^[a-zA-Z0-9_-]+$/.test(values.name?.trim() ?? "")) {
    error.name = L.modal.mcpServerEdit.invalidName
  }

  const urlCheck = formStringRequired({ maxLength: 2048 }).safeParse(values?.url?.trim() ?? "")
  if (!urlCheck.success) {
    error.url = urlCheck.error.issues[0]?.message
  } else if (!URL.canParse(values.url?.trim() ?? "") || !/^https?:\/\//.test(values.url?.trim() ?? "")) {
    error.url = L.modal.mcpServerEdit.invalidUrl
  }

  return error
}

export const McpServerEditModal = ({ show, onClose, data, onReject, onResolve }: McpServerEditModalProps) => {
  const router = useRouter()
  const notify = useNotification()
  const { mutateAsync: createMcpServer, isPending: isCreating } = useMcpServerCreate()
  const { mutateAsync: editMcpServer, isPending: isEditing } = useMcpServerEdit()
  const isPending = isCreating || isEditing
  const focusRef = (el: HTMLInputElement | null) => {
    if (el && show) {
      el.focus()
    }
  }
  return (
    <Modal show={show} onClose={onClose} title={data ? L.modal.mcpServerEdit.editTitle : L.modal.mcpServerEdit.createTitle}>
      <Form<FormType>
        validate={validate}
        initialValues={{ name: data?.name, url: data?.url, removeAccessToken: false }}
        onSubmit={async (values) => {
          const name = values.name?.trim() ?? ""
          const url = values.url?.trim() ?? ""
          const accessToken = values.accessToken?.trim() || undefined
          try {
            if (data) {
              // A blank token keeps the current one, unless the User chose to remove it.
              await editMcpServer({ id: data.id, name, url, accessToken: values.removeAccessToken ? null : accessToken })
            } else {
              await createMcpServer({ name, url, accessToken })
            }
            onClose?.()
            router.replace(router.asPath)
            onResolve?.()
          } catch (error) {
            notify.error(L.modal.mcpServerEdit.failed, error.message)
            onReject?.()
          }
        }}
        render={({ handleSubmit, hasValidationErrors, values }) => (
          <form onSubmit={handleSubmit} className="mt-4 flex flex-col gap-2 text-sm">
            <TextForm
              formName="name"
              label={L.modal.mcpServerEdit.name}
              placeholder={L.modal.mcpServerEdit.namePlaceholder}
              ref={focusRef}
            />
            <TextForm formName="url" label={L.modal.mcpServerEdit.url} placeholder={L.modal.mcpServerEdit.urlPlaceholder} />
            <TextForm
              formName="accessToken"
              type="password"
              autoComplete="off"
              label={L.modal.mcpServerEdit.accessToken}
              placeholder={
                data?.hasAccessToken ? L.modal.mcpServerEdit.accessTokenKeepPlaceholder : L.modal.mcpServerEdit.accessTokenPlaceholder
              }
              disabled={values.removeAccessToken}
            />
            {data?.hasAccessToken && (
              <VerticalAlignedItems
                className="items-center"
                items={[
                  {
                    label: <div className="text-primary">{L.modal.mcpServerEdit.removeAccessToken}</div>,
                    value: (
                      <div className="leading-0">
                        <ToggleForm formName="removeAccessToken" noErrorSpace />
                      </div>
                    ),
                  },
                ]}
              />
            )}
            <div className="text-muted-foreground">{L.modal.mcpServerEdit.connectionCheck}</div>
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

export const useMcpServerEditModal = () => {
  return useModal<Args>(McpServerEditModal)
}
