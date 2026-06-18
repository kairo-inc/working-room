import { Plus } from "lucide-react"
import { useRouter } from "next/router"

import { PageResult } from "@wr/shared"

import { RectangleButton } from "../../../components/buttons/rectangleButton"
import { BodyLayout } from "../../../components/layout/body"
import { PageLayout } from "../../../components/layout/page"
import { useNotification } from "../../../contexts/notification"
import { L } from "../../../localization"
import { AppAgent } from "../../../types/agent"
import { useAgentCreateModal } from "../../modals/agentCreate"
import { Table } from "../../table"

export interface PageAgentProps extends React.HTMLAttributes<HTMLDivElement> {
  data: PageResult<AppAgent>
}

export const PageAgent = ({ data }: PageAgentProps) => {
  const router = useRouter()
  const notify = useNotification()
  const { show: showAgentCreateModal, modal: AgentCreateModal } = useAgentCreateModal()

  return (
    <PageLayout>
      <BodyLayout
        title={"Agent list"}
        description={L.account.description}
        containerClassName="gap-10"
        tail={
          <RectangleButton icon={<Plus />} onClick={() => showAgentCreateModal({})}>
            Create
          </RectangleButton>
        }
      >
        <Table
          headers={["Name", "Tier", "Description"]}
          rows={data.data.map((item) => ({
            items: [item.name, item.tier, item.description ?? "-"],
          }))}
        />
      </BodyLayout>
      {AgentCreateModal}
    </PageLayout>
  )
}
