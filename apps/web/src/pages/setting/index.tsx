import { PageSetting, PageSettingProps } from "../../components/pages/setting"
import { handleSsr } from "../../middleware/ssr"
import { getWebAppDiContainer } from "../../server/container"
import { TenantService } from "../../server/services/tenantType"

export default function Setting({ ...props }: PageSettingProps) {
  return (
    <>
      <title>Setting</title>
      <PageSetting {...props} />
    </>
  )
}

export const getServerSideProps = handleSsr<PageSettingProps>({
  acceptRoles: ["admin", "owner"],
  fn: async () => {
    const now = new Date()
    // Recent 30 days.
    const startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 30, 0, 0, 0)
    const endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59)
    const server = getWebAppDiContainer().resolve<TenantService>("TenantService")
    const tenant = await server.get()
    const tokenUsage = await server.tokenUsage({ startDate, endDate })
    return { props: { data: tenant, tokenUsage } }
  },
})
