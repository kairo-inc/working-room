import { Pencil, Trash2 } from "lucide-react"
import { useRouter } from "next/router"

import { PageResult } from "@wr/shared"

import { L } from "../../../../localization"
import { Route } from "../../../../route"
import { AppAccessGroup } from "../../../../types/accessGroup"
import { AppFileDescriptorEssential } from "../../../../types/file"
import { AppUser } from "../../../../types/user"
import { RectangleButton } from "../../../buttons/rectangleButton"
import { BodyLayout } from "../../../layout/body"
import { PageLayout } from "../../../layout/page"
import { VerticalAlignedItems } from "../../../layout/verticalAlignedItems"
import { useAccessGroupDeleteModal } from "../../../modals/accessGroupDelete"
import { Pager } from "../../../pager"
import { Section } from "../../../section"
import { Table } from "../../../table"

export interface PageSettingAccessGroupProps extends React.HTMLAttributes<HTMLDivElement> {
  data: AppAccessGroup
  userList: PageResult<AppUser>
  resourceList: AppFileDescriptorEssential[]
}

export const PageSettingAccessGroup = ({ userList, resourceList, data }: PageSettingAccessGroupProps) => {
  const router = useRouter()

  const yesComponent = <span className="text-foreground font-bold">{L.settingAccessGroup.yes}</span>
  const noComponent = <span className="text-muted-foreground">{L.settingAccessGroup.no}</span>

  const { modal: AccessGroupDeleteModal, show: showAccessGroupDeleteModal } = useAccessGroupDeleteModal()

  return (
    <PageLayout>
      <BodyLayout
        title={L.settingAccessGroup.title}
        description={L.settingAccessGroup.description}
        containerClassName="gap-10"
        tail={
          <div className="flex gap-4">
            <RectangleButton
              variant="defaultOutline"
              icon={<Pencil size={18} />}
              onClick={() => router.push(Route.settingAccessGroupEdit(data.id))}
            >
              <span className="hidden sm:inline">{L.settingAccessGroup.edit}</span>
            </RectangleButton>
            <RectangleButton variant="destructive" icon={<Trash2 size={18} />} onClick={() => showAccessGroupDeleteModal({ data })}>
              <span className="hidden sm:inline">{L.settingAccessGroup.delete}</span>
            </RectangleButton>
          </div>
        }
      >
        <Section title={L.settingAccessGroup.details.title}>
          <VerticalAlignedItems
            items={[
              {
                label: L.settingAccessGroup.details.name,
                value: data.name,
              },
              {
                label: L.settingAccessGroup.details.description,
                value: data.description ?? "-",
              },
              {
                label: L.settingAccessGroup.details.type,
                value: data.isPersonal ? L.settingAccessGroup.details.personal : L.settingAccessGroup.details.group,
              },
              {
                label: L.settingAccessGroup.details.read,
                value: data.read ? yesComponent : noComponent,
              },
              {
                label: L.settingAccessGroup.details.write,
                value: data.write ? yesComponent : noComponent,
              },
            ]}
          />
        </Section>
        <Section title={L.settingAccessGroup.resources.title}>
          <Table
            headers={[{ label: L.settingAccessGroup.resources.name }, { label: L.settingAccessGroup.resources.type }]}
            rows={resourceList.map((resource) => ({
              onClick: () => router.push(Route.tree(resource.id)),
              items: [resource.name, resource.mimeType],
            }))}
          />
        </Section>
        <Section title={L.settingAccessGroup.users.title}>
          <Table
            headers={[{ label: L.settingAccessGroup.users.name }, { label: L.settingAccessGroup.users.email }]}
            rows={userList.data.map((user) => ({ items: [user.name, user.email] }))}
          />
          <Pager {...userList} className="mt-2" />
        </Section>
      </BodyLayout>
      {AccessGroupDeleteModal}
    </PageLayout>
  )
}
