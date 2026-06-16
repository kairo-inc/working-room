import { useRouter } from "next/router"

import { PageResult } from "@wr/shared"

import { L } from "../../../../localization"
import { Route } from "../../../../route"
import { AppAccessGroup } from "../../../../types/accessGroup"
import { BodyLayout } from "../../../layout/body"
import { PageLayout } from "../../../layout/page"
import { Pager } from "../../../pager"
import { Table } from "../../../table"

export interface PageSettingAccessGroupListProps extends React.HTMLAttributes<HTMLDivElement> {
  data: PageResult<AppAccessGroup>
}

export const PageSettingAccessGroupList = ({ data }: PageSettingAccessGroupListProps) => {
  const router = useRouter()
  return (
    <PageLayout>
      <BodyLayout title={L.settingAccessGroupList.title} description={L.settingAccessGroupList.description}>
        <Table
          headers={[
            L.settingAccessGroupList.headers.name,
            L.settingAccessGroupList.headers.type,
            L.settingAccessGroupList.headers.description,
          ]}
          rows={data.data.map((item) => ({
            onClick: () => router.push(Route.settingAccessGroup(item.id)),
            items: [item.name, item.isPersonal ? "Personal" : "Organization", item.description ?? "-"],
          }))}
        />
        <Pager {...data} className="mt-4" />
      </BodyLayout>
    </PageLayout>
  )
}
