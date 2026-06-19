import { Plus } from "lucide-react"
import { useRouter } from "next/router"
import { useEffect } from "react"

import { PageResult } from "@wr/shared"

import { RectangleButton } from "../../../components/buttons/rectangleButton"
import { BodyLayout } from "../../../components/layout/body"
import { PageLayout } from "../../../components/layout/page"
import { L } from "../../../localization"
import { Route } from "../../../route"
import { AppAgent } from "../../../types/agent"
import { useHoverMenu } from "../../hoverMenu"
import { useAgentDeleteModal } from "../../modals/agentDelete"
import { Table } from "../../table"

type AgentMenuAction = "delete"

export interface PageAgentListProps extends React.HTMLAttributes<HTMLDivElement> {
  data: PageResult<AppAgent>
}

export const PageAgentList = ({ data }: PageAgentListProps) => {
  const router = useRouter()

  const { menu: HoverMenu, show } = useHoverMenu<AgentMenuAction>()
  const { show: showDeleteModal, modal: AgentDeleteModal } = useAgentDeleteModal()

  useEffect(() => {
    const handleContextMenu = (event: MouseEvent) => {
      const closestRow = (event.target as HTMLElement).closest("tr")
      if (closestRow) {
        event.preventDefault()
        event.stopPropagation()
        const agentId = closestRow.getAttribute("data-agent-id")
        if (agentId) {
          show(event, {
            items: [{ action: "delete", label: L.agent.list.delete, variant: "destructive" }],
            onItemClick: (action: AgentMenuAction) => {
              if (action === "delete") {
                const agent = data.data.find((a) => a.id === agentId)
                if (agent) {
                  showDeleteModal({ data: agent })
                }
              }
            },
          })
        }
      }
    }

    document.addEventListener("contextmenu", handleContextMenu)
    return () => {
      document.removeEventListener("contextmenu", handleContextMenu)
    }
  }, [])

  return (
    <PageLayout>
      <BodyLayout
        title={L.agent.list.title}
        description={L.agent.list.description}
        containerClassName="gap-10"
        tail={
          <RectangleButton icon={<Plus />} onClick={() => router.push(Route.agentCreation())}>
            {L.agent.list.create}
          </RectangleButton>
        }
      >
        <Table
          headers={[L.agent.list.name, L.agent.list.tier, L.agent.list.description]}
          rows={data.data.map((item) => ({
            onClick: () => router.push(Route.agent(item.id)),
            items: [item.name, item.tier, item.description ?? L.agent.list.noData],
            dataAttrs: { "data-agent-id": item.id },
          }))}
        />
      </BodyLayout>
      {HoverMenu}
      {AgentDeleteModal}
    </PageLayout>
  )
}
