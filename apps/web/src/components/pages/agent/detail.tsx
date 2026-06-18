import { useRouter } from "next/router"

import { useNotification } from "../../../contexts/notification"
import { Route } from "../../../route"
import { AppAgent } from "../../../types/agent"
import { RectangleButton } from "../../buttons/rectangleButton"
import { BodyLayout } from "../../layout/body"
import { PageLayout } from "../../layout/page"
import { Section } from "../../section"

export interface PageAgentProps extends React.HTMLAttributes<HTMLDivElement> {
  data: AppAgent
}

export const PageAgent = ({ data }: PageAgentProps) => {
  const router = useRouter()
  const notify = useNotification()

  return (
    <PageLayout>
      <BodyLayout
        title={"Agent"}
        description={data.description ?? "Agent details"}
        containerClassName="gap-10"
        tail={<RectangleButton onClick={() => router.push(Route.agentEdit(data.id))}>Edit</RectangleButton>}
      >
        <div className="flex w-full flex-col gap-6">
          <Section title="Agent Descriptions" containerClassName="flex flex-col items-start gap-2">
            <div className="grid grid-cols-[auto_1fr] gap-2 gap-x-4 text-base">
              <div className="font-bold">Name</div>
              <div>{data.name}</div>
              <div className="font-bold">Model Tier</div>
              <div>{data.tier}</div>
              <div className="font-bold">Description </div>
              <div>{data.description ?? "-"}</div>
            </div>
          </Section>
          <Section title="Prompt" containerClassName="flex flex-col gap-8">
            <div className="flex flex-col gap-2">
              <div className="font-bold">Description for Agent</div>
              <div>{data.descriptionForAgent}</div>
            </div>
            <div className="flex flex-col gap-2">
              <div className="font-bold">System prompt</div>
              <div>{data.prompt}</div>
            </div>
          </Section>
        </div>
      </BodyLayout>
    </PageLayout>
  )
}
