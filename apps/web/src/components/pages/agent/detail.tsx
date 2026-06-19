import { useRouter } from "next/router"

import { L } from "../../../localization"
import { Route } from "../../../route"
import { AppAgent } from "../../../types/agent"
import { RectangleButton } from "../../buttons/rectangleButton"
import { FileIconSm } from "../../file/item"
import { BodyLayout } from "../../layout/body"
import { PageLayout } from "../../layout/page"
import { Markdown } from "../../markdown"
import { Section } from "../../section"

export interface PageAgentProps extends React.HTMLAttributes<HTMLDivElement> {
  data: AppAgent
}

export const PageAgent = ({ data }: PageAgentProps) => {
  const router = useRouter()

  return (
    <PageLayout>
      <BodyLayout
        title={L.agent.detail.title}
        description={data.description ?? L.agent.detail.defaultDescription}
        containerClassName="gap-10"
        tail={<RectangleButton onClick={() => router.push(Route.agentEdit(data.id))}>{L.agent.detail.edit}</RectangleButton>}
      >
        <div className="flex w-full flex-col gap-6">
          <Section title={L.agent.detail.sectionDescriptions} containerClassName="flex flex-col items-start gap-2">
            <div className="grid grid-cols-[auto_1fr] gap-2 gap-x-4 text-base">
              <div className="font-bold">{L.agent.detail.fields.name}</div>
              <div>{data.name}</div>
              <div className="font-bold">{L.agent.detail.fields.tier}</div>
              <div>{data.tier}</div>
              <div className="font-bold">{L.agent.detail.fields.workingFolder}</div>
              <div>
                {data.workingFolder ? (
                  <a href={Route.tree(data.workingFolder.id)} className="inline-flex items-center gap-1">
                    <FileIconSm type={data.workingFolder.mimeType} />
                    {data.workingFolder.name}
                  </a>
                ) : (
                  L.agent.detail.fields.noData
                )}
              </div>
              <div className="font-bold">{L.agent.detail.fields.description}</div>
              <div>{data.description ?? L.agent.detail.fields.noData}</div>
            </div>
          </Section>
          <Section title={L.agent.detail.sectionDescriptionForAgent} containerClassName="flex flex-col gap-8">
            <Markdown markdown={data.descriptionForAgent} />
          </Section>
          <Section title={L.agent.detail.sectionPrompt} containerClassName="flex flex-col gap-8">
            <Markdown markdown={data.prompt} />
          </Section>
        </div>
      </BodyLayout>
    </PageLayout>
  )
}
