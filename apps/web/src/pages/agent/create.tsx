import { PageAgentCreate, PageAgentCreateProps } from "../../components/pages/agent/create"
import { handleSsr } from "../../middleware/ssr"

export default function AgentCreation({ ...props }: PageAgentCreateProps) {
  return (
    <>
      <title>Agent Creation</title>
      <PageAgentCreate {...props} />
    </>
  )
}

export const getServerSideProps = handleSsr<PageAgentCreateProps>({})
