import { PageAccount, PageAccountProps } from "../components/pages/account"
import { handleSsr } from "../middleware/ssr"
import { getWebAppDiContainer } from "../server/container"
import { McpServerService } from "../server/services/mcpServerType"
import { OauthClientService } from "../server/services/oauthClientType"
import { UserService } from "../server/services/userType"

export default function Account({ ...props }: PageAccountProps) {
  return (
    <>
      <title>Account</title>
      <PageAccount {...props} />
    </>
  )
}

export const getServerSideProps = handleSsr<PageAccountProps>({
  fn: async () => {
    const userService = getWebAppDiContainer().resolve<UserService>("UserService")
    const oauthClientService = getWebAppDiContainer().resolve<OauthClientService>("OauthClientService")
    const mcpServerService = getWebAppDiContainer().resolve<McpServerService>("McpServerService")
    const oauthClients = await oauthClientService.getList()
    const mcpServers = await mcpServerService.getList()
    const data = await userService.getMySetting()
    return { props: { data, oauthClients: oauthClients, mcpServers } }
  },
})
