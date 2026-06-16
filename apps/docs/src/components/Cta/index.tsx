import { Zap } from "lucide-react"

import { Section } from "../Section"

export function Cta() {
  return (
    <Section
      className="bg-background border-border relative overflow-hidden border-t"
      innerClassName="relative z-10 flex flex-col items-center text-center py-20"
    >
      {/* Subtle background glow effect using standard div to avoid heavy animations */}
      <div className="pointer-events-none absolute top-1/2 left-1/2 h-150 w-150 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white/5 blur-[120px]" />

      <div className="border-border bg-card mb-8 flex h-16 w-16 items-center justify-center rounded-2xl border shadow-xl">
        <div className="bg-foreground flex h-6 w-6 items-center justify-center rounded-sm">
          <div className="bg-card h-2 w-2 rounded-sm" />
        </div>
      </div>

      <h2 className="text-foreground mb-8 max-w-2xl text-4xl font-semibold tracking-tight md:text-5xl">AI collaborative file system.</h2>

      <div className="flex w-full flex-col items-center justify-center gap-4 sm:flex-row">
        <button className="bg-primary text-background flex h-12 w-full items-center justify-center gap-2 rounded-md border-none px-8 font-medium transition-opacity hover:opacity-80 sm:w-auto">
          <Zap className="fill-background h-4 w-4" />
          Start Building
        </button>
        <button className="border-border bg-card text-foreground hover:bg-muted flex h-12 w-full items-center justify-center gap-2 rounded-md border px-8 font-bold transition-colors sm:w-auto">
          View on GitHub
        </button>
      </div>
    </Section>
  )
}
