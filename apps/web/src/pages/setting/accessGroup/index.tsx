import { AccessGroupSortBy } from "@wr/db"

import { PageSettingAccessGroupList, PageSettingAccessGroupListProps } from "../../../components/pages/setting/accessGroup/list"
import { handleSsr } from "../../../middleware/ssr"
import { getWebAppDiContainer } from "../../../server/container"
import { AccessGroupService } from "../../../server/services/accessGroupType"
import { ensurePage } from "../../../utils/queryParser"

export default function AccessGroupList({ ...props }: PageSettingAccessGroupListProps) {
  return (
    <>
      <title>Access Group List</title>
      <PageSettingAccessGroupList {...props} />
    </>
  )
}

export const getServerSideProps = handleSsr<PageSettingAccessGroupListProps>({
  acceptRoles: ["admin", "owner"],
  fn: async (ctx) => {
    const pages = ensurePage<AccessGroupSortBy>(ctx)
    const service = getWebAppDiContainer().resolve<AccessGroupService>("AccessGroupService")
    const data = await service.getList({ ...pages })
    return { props: { data } }
  },
})
