import { PageAgent, PageAgentProps } from "../../../components/pages/agent/detail"
import { handleSsr } from "../../../middleware/ssr"
import { getWebAppDiContainer } from "../../../server/container"
import { AgentService } from "../../../server/services/agentType"
import { ensureQuery } from "../../../utils/queryParser"

export default function Agent({ ...props }: PageAgentProps) {
  return (
    <>
      <title>Agent</title>
      <PageAgent {...props} />
    </>
  )
}

export const getServerSideProps = handleSsr<PageAgentProps>({
  fn: async (ctx) => {
    const id = ensureQuery(ctx, "id")
    const agentService = getWebAppDiContainer().resolve<AgentService>("AgentService")
    const data = await agentService.get({ id })
    return { props: { data } }
  },
})
