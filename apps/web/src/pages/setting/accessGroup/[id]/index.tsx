import { PageSettingAccessGroup, PageSettingAccessGroupProps } from "../../../../components/pages/setting/accessGroup"
import { handleSsr } from "../../../../middleware/ssr"
import { getWebAppDiContainer } from "../../../../server/container"
import { AccessGroupService } from "../../../../server/services/accessGroupType"
import { ensureQuery } from "../../../../utils/queryParser"

export default function AccessGroup(props: PageSettingAccessGroupProps) {
  return (
    <>
      <title>Access Group</title>
      <PageSettingAccessGroup {...props} />
    </>
  )
}

export const getServerSideProps = handleSsr<PageSettingAccessGroupProps>({
  acceptRoles: ["admin", "owner"],
  fn: async (ctx) => {
    const descId = ensureQuery(ctx, "id")
    const service = getWebAppDiContainer().resolve<AccessGroupService>("AccessGroupService")
    const data = await service.get({ id: descId })
    const userList = await service.getUserList({ id: descId })
    const resourceList = await service.getResourceList({ id: descId })
    return {
      props: {
        data,
        userList,
        resourceList,
      },
    }
  },
})
