import { route } from "@site/src/route"

export const Hero = () => {
  return (
    <section className={`bg-background text-foreground`}>
      <div className="mx-auto grid w-full max-w-7xl gap-12 px-5 pt-16 pb-12 text-center sm:px-8 lg:px-10 lg:pt-24 lg:pb-16">
        <div className="mx-auto max-w-5xl">
          <div className="border-border bg-card text-muted-foreground mb-7 inline-flex items-center gap-2 rounded-full border px-3 py-1.5 font-mono text-xs">
            <span className="bg-foreground size-1.5 rounded-full" />
            Open source AI workspace
          </div>
          <h1 className="mx-auto max-w-5xl text-5xl font-semibold tracking-tighter text-balance sm:text-6xl lg:text-[5rem]">
            Shared workspace for teams and AI agents.
          </h1>
          <p className="text-muted-foreground mx-auto mt-7 max-w-3xl text-lg leading-8 text-balance sm:text-xl">
            WorkingRoom gives AI agents shared files, permission boundaries, change history, and approval workflows before changes are
            applied.
          </p>
          <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <a
              className="bg-primary hover:bg-primary-hover hover:text-primary-foreground text-primary-foreground inline-flex h-11 items-center gap-2 rounded-lg px-5 text-sm font-semibold shadow-sm transition-transform hover:-translate-y-0.5"
              href={route.gettingStarted}
            >
              Get Started
            </a>
            <a
              className="border-border bg-card hover:bg-accent inline-flex h-11 items-center rounded-lg border px-5 text-sm font-semibold shadow-sm transition-colors"
              href={route.github}
            >
              View on GitHub
            </a>
          </div>
        </div>
      </div>
    </section>
  )
}
