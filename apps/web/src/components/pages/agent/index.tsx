import { Plus } from "lucide-react"
import { useRouter } from "next/router"

import { PageResult } from "@wr/shared"

import { RectangleButton } from "../../../components/buttons/rectangleButton"
import { BodyLayout } from "../../../components/layout/body"
import { PageLayout } from "../../../components/layout/page"
import { useNotification } from "../../../contexts/notification"
import { Route } from "../../../route"
import { AppAgent } from "../../../types/agent"
import { Table } from "../../table"

export interface PageAgentListProps extends React.HTMLAttributes<HTMLDivElement> {
  data: PageResult<AppAgent>
}

export const PageAgentList = ({ data }: PageAgentListProps) => {
  const router = useRouter()
  const notify = useNotification()

  return (
    <PageLayout>
      <BodyLayout
        title={"Agent list"}
        description={"List of agents you have created"}
        containerClassName="gap-10"
        tail={
          <RectangleButton icon={<Plus />} onClick={() => router.push(Route.agentCreation())}>
            Create
          </RectangleButton>
        }
      >
        <Table
          headers={["Name", "Tier", "Description"]}
          rows={data.data.map((item) => ({
            onClick: () => router.push(Route.agent(item.id)),
            items: [item.name, item.tier, item.description ?? "-"],
          }))}
        />
      </BodyLayout>
    </PageLayout>
  )
}
