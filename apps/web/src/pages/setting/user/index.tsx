import { UserSortBy } from "@wr/db"

import { PageSettingUserList, PageSettingUserListProps } from "../../../components/pages/setting/user"
import { handleSsr } from "../../../middleware/ssr"
import { getWebAppDiContainer } from "../../../server/container"
import { UserService } from "../../../server/services/userType"
import { ensurePage } from "../../../utils/queryParser"

export default function UserList({ ...props }: PageSettingUserListProps) {
  return (
    <>
      <title>User List</title>
      <PageSettingUserList {...props} />
    </>
  )
}

export const getServerSideProps = handleSsr<PageSettingUserListProps>({
  acceptRoles: ["admin", "owner"],
  fn: async (ctx) => {
    const pages = ensurePage<UserSortBy>(ctx)
    const service = getWebAppDiContainer().resolve<UserService>("UserService")
    const data = await service.getList({ ...pages })
    return { props: { data } }
  },
})
