import { Plus, Trash } from "lucide-react"
import { useRouter } from "next/router"

import { PageResult } from "@wr/shared"

import { useNotification } from "../../../../contexts/notification"
import { useAccessGroupEdit } from "../../../../hooks/trpc/accessGroup"
import { L } from "../../../../localization"
import { AppAccessGroup } from "../../../../types/accessGroup"
import { AppFileDescriptorEssential } from "../../../../types/file"
import { AppUser } from "../../../../types/user"
import { IconButton } from "../../../buttons/iconButton"
import { BodyLayout } from "../../../layout/body"
import { PageLayout } from "../../../layout/page"
import { useAccessGroupResourceDeleteModal } from "../../../modals/accessGroupResourceDelete"
import { useAccessGroupUserDeleteModal } from "../../../modals/accessGroupUserDelete"
import { useFileSelectModal } from "../../../modals/fileSelect"
import { useUserSelectModal } from "../../../modals/userSelect"
import { Pager } from "../../../pager"
import { Section } from "../../../section"
import { Table } from "../../../table"

export interface PageSettingAccessGroupEditProps extends React.HTMLAttributes<HTMLDivElement> {
  data: AppAccessGroup
  userList: PageResult<AppUser>
  resourceList: AppFileDescriptorEssential[]
}

export const PageSettingAccessGroupEdit = ({ data, userList, resourceList }: PageSettingAccessGroupEditProps) => {
  const router = useRouter()
  const notify = useNotification()
  const { mutateAsync } = useAccessGroupEdit()

  const yesComponent = <span className="text-foreground font-bold">{L.settingAccessGroup.yes}</span>
  const noComponent = <span className="text-muted-foreground">{L.settingAccessGroup.no}</span>

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

  return (
    <PageLayout>
      <BodyLayout title={L.settingAccessGroup.editTitle} description={L.settingAccessGroupList.description} containerClassName="gap-10">
        <Section title={L.settingAccessGroup.details.title}>
          <div className="grid grid-cols-[auto_1fr] gap-2 gap-x-4 text-base">
            <div className="font-bold">{L.settingAccessGroup.details.name}</div>
            <div>{data.name}</div>
            <div className="font-bold">{L.settingAccessGroup.details.description}</div>
            <div>{data.description ?? "-"}</div>
            <div className="font-bold">{L.settingAccessGroup.details.type}</div>
            <div>{data.isPersonal ? L.settingAccessGroup.details.personal : L.settingAccessGroup.details.group}</div>
            <div className="font-bold">{L.settingAccessGroup.details.read}</div>
            <div>{data.read ? yesComponent : noComponent}</div>
            <div className="font-bold">{L.settingAccessGroup.details.write}</div>
            <div>{data.write ? yesComponent : noComponent}</div>
          </div>
        </Section>
        <Section title={L.settingAccessGroup.resources.title}>
          <Table
            headers={[L.settingAccessGroup.resources.name, L.settingAccessGroup.resources.type, ""]}
            rows={[
              {
                items: [
                  <div className="flex items-center gap-2 text-sm">
                    <Plus />
                    {L.settingAccessGroup.addResource}
                  </div>,
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
            headers={[L.settingAccessGroup.users.name, L.settingAccessGroup.users.email, ""]}
            rows={[
              {
                items: [
                  <div className="flex items-center gap-2 text-sm">
                    <Plus />
                    {L.settingAccessGroup.addUser}
                  </div>,
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
          <Pager {...userList} className="mt-4" />
        </Section>
      </BodyLayout>
      {FileSelectModal}
      {UserSelectModal}
      {AccessGroupResourceDeleteModal}
      {AccessGroupUserDeleteModal}
    </PageLayout>
  )
}
