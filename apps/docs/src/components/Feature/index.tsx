import { CheckCircle, Code2, Globe, Network, Shield, Undo2 } from "lucide-react"

import { Section } from "../Section"

export function FeaturesGrid() {
  const features = [
    {
      icon: <Network />,
      title: "Shared Workspace",
      desc: "A singular hub where your team's files, decisions, and AI interactions live together.",
    },
    {
      icon: <Shield />,
      title: "File Access Control",
      desc: "Granular permissions let you decide who (or which AI) can see and modify each file.",
    },
    {
      icon: <CheckCircle />,
      title: "Human Approvals",
      desc: "Set strict policies requiring human sign-off before AI can execute sensitive workflows.",
    },
    {
      icon: <Undo2 />,
      title: "Change History",
      desc: "Every edit is tracked with a full history, so you can see who changed what, when, and why.",
    },
    {
      icon: <Code2 />,
      title: "OSS & Self-hosted",
      desc: "Deploy on your own infrastructure. Maintain absolute control over your data and models.",
    },
    {
      icon: <Globe />,
      title: "Web Browser Access",
      desc: "No client installs needed. Access your workspace securely from anywhere with just a web browser.",
    },
  ]

  return (
    <Section className="bg-background">
      <div className="text-foreground mb-12 text-center text-4xl font-semibold tracking-tight text-balance">
        Built for safe human-AI collaboration
      </div>
      <div className="border-border bg-border grid grid-cols-1 gap-px overflow-hidden rounded-2xl border md:grid-cols-2 lg:grid-cols-3">
        {features.map((feat, i) => (
          <div key={i} className="bg-card hover:bg-accent p-10 transition-colors">
            <div className="text-card-foreground mb-6 flex h-10 w-10 items-center justify-center">{feat.icon}</div>
            <h3 className="text-card-foreground mb-3 text-xl font-medium">{feat.title}</h3>
            <p className="text-muted-foreground text-base leading-relaxed">{feat.desc}</p>
          </div>
        ))}
      </div>
    </Section>
  )
}
