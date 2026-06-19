import { PageAgentList, PageAgentListProps } from "../../components/pages/agent"
import { handleSsr } from "../../middleware/ssr"
import { getWebAppDiContainer } from "../../server/container"
import { AgentService } from "../../server/services/agentType"

export default function AgentList({ ...props }: PageAgentListProps) {
  return (
    <>
      <title>Agent List</title>
      <PageAgentList {...props} />
    </>
  )
}

export const getServerSideProps = handleSsr<PageAgentListProps>({
  fn: async () => {
    const agentService = getWebAppDiContainer().resolve<AgentService>("AgentService")
    const data = await agentService.getList({})
    return { props: { data } }
  },
})
