import Translate, { translate } from "@docusaurus/Translate"
import { route } from "@site/src/route"
import { ArrowRight, ExternalLinkIcon } from "lucide-react"

import { Section } from "../Section"

export function Info() {
  const infoList = [
    {
      title: translate({ id: "info.links.gettingStarted", message: "Getting Started" }),
      href: "/docs/getting-started",
    },
    {
      title: translate({ id: "info.links.userGuide", message: "User Guide" }),
      href: "/docs/user-guide/chat",
    },
    {
      title: translate({ id: "info.links.forDevelopers", message: "For Developers" }),
      href: "/docs/development/architecture",
    },
    {
      title: translate({ id: "info.links.roadmap", message: "Roadmap" }),
      href: "/docs/roadmap",
    },
    { title: "GitHub", href: route.github, isExternal: true },
  ]

  return (
    <Section
      className="bg-background border-border relative overflow-hidden border-t"
      innerClassName="relative z-10 flex flex-col items-center text-center py-20"
    >
      <div className="flex max-w-3xl flex-col items-center gap-8">
        <div className="text-4xl font-bold">
          <Translate id="info.sectionTitle">More info</Translate>
        </div>
        <div className="border-border bg-card flex flex-col items-start gap-8 rounded-md border p-8">
          <div className="flex flex-col items-start gap-2">
            <div className="text-left text-2xl font-bold">
              <Translate id="info.documentation.title">Documentation</Translate>
            </div>
            <div className="text-muted-foreground text-left text-base">
              <Translate id="info.documentation.description">
                Dive into our docs to explore detailed guides, API references, and best practices for getting the most out of WorkingRoom.
              </Translate>
            </div>
          </div>
          <div className="flex flex-col items-start gap-2">
            {infoList.map((info, i) => (
              <div key={i} className="text-foreground px-4 text-lg">
                <a href={info.href} className="text-link inline-flex items-center gap-1 font-medium hover:underline">
                  {info.isExternal ? (
                    <ExternalLinkIcon className="inline-block h-4 w-4" />
                  ) : (
                    <ArrowRight className="inline-block h-4 w-4" />
                  )}
                  {info.title}
                </a>
              </div>
            ))}
          </div>
        </div>
      </div>
    </Section>
  )
}
