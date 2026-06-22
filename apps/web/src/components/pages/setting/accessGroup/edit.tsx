import { Plus, Trash } from "lucide-react"
import { useRouter } from "next/router"
import { Form } from "react-final-form"

import { PageResult } from "@wr/shared"

import { useNotification } from "../../../../contexts/notification"
import { useAccessGroupEdit } from "../../../../hooks/trpc/accessGroup"
import { L } from "../../../../localization"
import { AppAccessGroup } from "../../../../types/accessGroup"
import { AppFileDescriptorEssential } from "../../../../types/file"
import { AppUser } from "../../../../types/user"
import { IconButton } from "../../../buttons/iconButton"
import { RectangleButton } from "../../../buttons/rectangleButton"
import { TextAreaForm } from "../../../forms/textAreaForm"
import { TextForm } from "../../../forms/textForm"
import { ToggleForm } from "../../../forms/toggleForm"
import { BodyLayout } from "../../../layout/body"
import { PageLayout } from "../../../layout/page"
import { VerticalAlignedItems } from "../../../layout/verticalAlignedItems"
import { useAccessGroupResourceDeleteModal } from "../../../modals/accessGroupResourceDelete"
import { useAccessGroupUserDeleteModal } from "../../../modals/accessGroupUserDelete"
import { useFileSelectModal } from "../../../modals/fileSelect"
import { useUserSelectModal } from "../../../modals/userSelect"
import { Pager } from "../../../pager"
import { Section } from "../../../section"
import { Table } from "../../../table"

type FormData = {
  name: string
  description?: string
  read: boolean
  write: boolean
}

export interface PageSettingAccessGroupEditProps extends React.HTMLAttributes<HTMLDivElement> {
  data: AppAccessGroup
  userList: PageResult<AppUser>
  resourceList: AppFileDescriptorEssential[]
}

const validate = (values: { name: string; description?: string }) => {
  const errors: Partial<{ name: string; description: string }> = {}

  if (!values.name || values.name.trim() === "") {
    errors.name = L.common.validation.required
  } else if (values.name.length > 128) {
    errors.name = L.common.validation.maxLength.replace("{max}", "128")
  }

  if (values.description && values.description.length > 1024) {
    errors.description = L.common.validation.maxLength.replace("{max}", "1024")
  }

  return errors
}

export const PageSettingAccessGroupEdit = ({ data, userList, resourceList }: PageSettingAccessGroupEditProps) => {
  const router = useRouter()
  const notify = useNotification()
  const { mutateAsync } = useAccessGroupEdit()

  const detailItemsLabelClassName = "flex h-15 items-center pb-5"
  const detailItemsLabelSmallClassName = "flex h-12 items-center pb-5"

  const { modal: FileSelectModal, show: showFileSelectModal } = useFileSelectModal()
  const { modal: UserSelectModal, show: showUserSelectModal } = useUserSelectModal()

  const { modal: AccessGroupUserDeleteModal, show: showAccessGroupUserDeleteModal } = useAccessGroupUserDeleteModal()
  const { modal: AccessGroupResourceDeleteModal, show: showAccessGroupResourceDeleteModal } = useAccessGroupResourceDeleteModal()

  const onFileSelect = async (fileId: string) => {
    try {
      await mutateAsync({
        id: data.id,
        resourceIdsToAdd: [fileId],
      })
      notify.info(L.common.ok, L.settingAccessGroup.fileAdded)
      router.replace(router.asPath)
    } catch (e) {
      notify.error(L.common.error, e.message)
    }
  }

  const onUserSelect = async (userId: string) => {
    try {
      await mutateAsync({
        id: data.id,
        userIdsToAdd: [userId],
      })
      notify.info(L.common.ok, L.settingAccessGroup.userAdded)
      router.replace(router.asPath)
    } catch (e) {
      notify.error(L.common.error, e.message)
    }
  }

  const initialValues: Partial<FormData> = { name: data.name, description: data.description, read: data.read, write: data.write }
  const isModifiedAny = (values?: Record<string, boolean>) => (values ? Object.keys(values).some((key) => values[key]) : false)

  return (
    <PageLayout>
      <BodyLayout title={L.settingAccessGroup.editTitle} description={L.settingAccessGroupList.description} containerClassName="gap-10">
        <Section title={L.settingAccessGroup.details.title}>
          <Form<FormData>
            initialValues={initialValues}
            validate={validate}
            onSubmit={async (values) => {
              try {
                await mutateAsync({
                  id: data.id,
                  name: values.name.trim(),
                  description: values.description?.trim(),
                  read: values.read,
                  write: values.write,
                })
                notify.info(L.common.ok, L.settingAccessGroup.updated)
                router.replace(router.asPath)
              } catch (e) {
                notify.error(L.common.error, e.message)
              }
            }}
            render={({ handleSubmit, submitting, hasValidationErrors, form: { reset }, modified }) => (
              <form onSubmit={handleSubmit} className="flex flex-col gap-2">
                <VerticalAlignedItems
                  items={[
                    {
                      label: <div className={detailItemsLabelClassName}>{L.settingAccessGroup.details.name}</div>,
                      value: <TextForm formName="name" />,
                    },
                    {
                      label: <div className={detailItemsLabelClassName}>{L.settingAccessGroup.details.description}</div>,
                      value: <TextAreaForm formName="description" rows={2} placeholder={L.settingAccessGroup.details.description} />,
                    },
                    {
                      label: <div className={detailItemsLabelSmallClassName}>{L.settingAccessGroup.details.read}</div>,
                      value: <ToggleForm formName="read" />,
                    },
                    {
                      label: <div className={detailItemsLabelSmallClassName}>{L.settingAccessGroup.details.write}</div>,
                      value: <ToggleForm formName="write" />,
                    },
                  ]}
                />
                <div className="flex justify-end gap-4">
                  <RectangleButton type="submit" loading={submitting} disabled={hasValidationErrors || !isModifiedAny(modified)}>
                    {L.common.save}
                  </RectangleButton>
                  <RectangleButton variant="defaultOutline" disabled={submitting} onClick={() => reset(initialValues)}>
                    {L.common.cancel}
                  </RectangleButton>
                </div>
              </form>
            )}
          />
        </Section>
        <Section title={L.settingAccessGroup.resources.title}>
          <Table
            headers={[
              { label: L.settingAccessGroup.resources.name },
              { label: L.settingAccessGroup.resources.type },
              { label: "", tight: true },
            ]}
            rows={[
              {
                items: [
                  <div className="flex items-center gap-2 text-sm">
                    <Plus />
                    {L.settingAccessGroup.addResource}
                  </div>,
                  "",
                  "",
                ],
                onClick: () =>
                  showFileSelectModal({
                    onFileSelected: (f) => onFileSelect(f.id),
                  }),
              },
              ...resourceList.map((resource) => ({
                items: [
                  resource.name,
                  resource.mimeType,
                  <IconButton
                    icon={<Trash />}
                    size="sm"
                    onClick={() =>
                      showAccessGroupResourceDeleteModal({
                        data: { accessGroupId: data.id, resourceId: resource.id, resourceName: resource.name },
                      })
                    }
                  />,
                ],
              })),
            ]}
          />
        </Section>
        <Section title={L.settingAccessGroup.users.title}>
          <Table
            headers={[{ label: L.settingAccessGroup.users.name }, { label: L.settingAccessGroup.users.email }, { label: "", tight: true }]}
            rows={[
              {
                items: [
                  <div className="flex items-center gap-2 text-sm">
                    <Plus />
                    {L.settingAccessGroup.addUser}
                  </div>,
                  "",
                  "",
                ],
                onClick: () =>
                  showUserSelectModal({
                    onUserSelected: (u) => onUserSelect(u.id),
                  }),
              },
              ...userList.data.map((user) => ({
                items: [
                  user.name,
                  user.email,
                  <IconButton
                    icon={<Trash />}
                    size="sm"
                    onClick={() =>
                      showAccessGroupUserDeleteModal({ data: { accessGroupId: data.id, userId: user.id, userName: user.name } })
                    }
                  />,
                ],
              })),
            ]}
          />
          <Pager {...userList} className="mt-2" />
        </Section>
      </BodyLayout>
      {FileSelectModal}
      {UserSelectModal}
      {AccessGroupResourceDeleteModal}
      {AccessGroupUserDeleteModal}
    </PageLayout>
  )
}
