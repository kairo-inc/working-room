// src/theme/Footer/index.tsx
import useDocusaurusContext from "@docusaurus/useDocusaurusContext"

export default function Footer() {
  const { siteConfig } = useDocusaurusContext()
  return (
    <footer className="border-border bg-card border-t px-6 py-10">
      <div className="mx-auto max-w-6xl">
        <div className="text-sm font-semibold">{siteConfig.title}</div>
        <p className="text-muted-foreground mt-2 mb-0 text-sm">{siteConfig.tagline}</p>
        <p className="text-muted-foreground mt-2 text-sm">Apache License 2.0 Built with Next.js and the Vercel AI SDK.</p>
        <div className="text-muted-foreground text-sm">© {new Date().getFullYear()} WorkingRoom</div>
      </div>
    </footer>
  )
}
