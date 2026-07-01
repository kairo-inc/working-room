import { Pencil } from "lucide-react"
import { useRouter } from "next/router"

import { L } from "../../../localization"
import { Route } from "../../../route"
import { AppAgent } from "../../../types/agent"
import { RectangleButton } from "../../buttons/rectangleButton"
import { FileIconSm } from "../../file/item"
import { BodyLayout } from "../../layout/body"
import { PageLayout } from "../../layout/page"
import { VerticalAlignedItems } from "../../layout/verticalAlignedItems"
import { Link } from "../../link"
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
        tail={
          <RectangleButton icon={<Pencil size={18} />} onClick={() => router.push(Route.agentEdit(data.id))}>
            <span className="hidden sm:inline">{L.agent.detail.edit}</span>
          </RectangleButton>
        }
      >
        <div className="flex w-full flex-col gap-6">
          <Section title={L.agent.detail.sectionDescriptions} containerClassName="flex flex-col items-start gap-2">
            <VerticalAlignedItems
              items={[
                {
                  label: L.agent.detail.fields.name,
                  value: data.name,
                },
                {
                  label: L.agent.detail.fields.tier,
                  value: data.tier,
                },
                {
                  label: L.agent.detail.fields.workingFolder,
                  value: data.workingFolder ? (
                    <Link href={Route.tree(data.workingFolder.id)} className="inline-flex items-center gap-1">
                      <FileIconSm type={data.workingFolder.mimeType} />
                      {data.workingFolder.name}
                    </Link>
                  ) : (
                    L.agent.detail.fields.noData
                  ),
                },
                {
                  label: L.agent.detail.fields.description,
                  value: data.description ?? L.agent.detail.fields.noData,
                },
              ]}
            />
          </Section>
          <Section title={L.agent.detail.sectionDescriptionForAgent}>
            <Markdown markdown={data.descriptionForAgent} />
          </Section>
          <Section title={L.agent.detail.sectionPrompt}>
            <Markdown markdown={data.prompt} />
          </Section>
        </div>
      </BodyLayout>
    </PageLayout>
  )
}
