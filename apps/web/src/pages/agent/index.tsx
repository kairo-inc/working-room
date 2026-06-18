import { PageAgent, PageAgentProps } from "../../components/pages/agent"
import { handleSsr } from "../../middleware/ssr"
import { getWebAppDiContainer } from "../../server/container"
import { AgentService } from "../../server/services/agentType"

export default function Account({ ...props }: PageAgentProps) {
  return (
    <>
      <title>Account</title>
      <PageAgent {...props} />
    </>
  )
}

export const getServerSideProps = handleSsr<PageAgentProps>({
  fn: async () => {
    const agentService = getWebAppDiContainer().resolve<AgentService>("AgentService")
    const data = await agentService.getList({})
    return { props: { data } }
  },
})
