import { PageAgentEdit, PageAgentEditProps } from "../../../components/pages/agent/edit"
import { handleSsr } from "../../../middleware/ssr"
import { getWebAppDiContainer } from "../../../server/container"
import { AgentService } from "../../../server/services/agentType"
import { ensureQuery } from "../../../utils/queryParser"

export default function AgentEdit({ ...props }: PageAgentEditProps) {
  return (
    <>
      <title>Agent</title>
      <PageAgentEdit {...props} />
    </>
  )
}

export const getServerSideProps = handleSsr<PageAgentEditProps>({
  fn: async (ctx) => {
    const id = ensureQuery(ctx, "id")
    const agentService = getWebAppDiContainer().resolve<AgentService>("AgentService")
    const data = await agentService.get({ id })
    return { props: { data } }
  },
})
