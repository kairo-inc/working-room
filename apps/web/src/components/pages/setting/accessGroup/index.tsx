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
          <RectangleButton variant="destructive" onClick={() => showAccessGroupDeleteModal({ data })}>
            {L.settingAccessGroup.delete}
          </RectangleButton>
        }
      >
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
            headers={[L.settingAccessGroup.resources.name, L.settingAccessGroup.resources.type]}
            rows={resourceList.map((resource) => ({
              onClick: () => router.push(Route.tree(resource.id)),
              items: [resource.name, resource.mimeType],
            }))}
          />
        </Section>
        <Section title={L.settingAccessGroup.users.title}>
          <Table
            headers={[L.settingAccessGroup.users.name, L.settingAccessGroup.users.email]}
            rows={userList.data.map((user) => ({ items: [user.name, user.email] }))}
          />
          <Pager {...userList} className="mt-4" />
        </Section>
      </BodyLayout>
      {AccessGroupDeleteModal}
    </PageLayout>
  )
}
