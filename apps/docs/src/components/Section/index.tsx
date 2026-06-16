import React from "react"
import { twMerge } from "tailwind-merge"

export function Section({
  children,
  className,
  id,
  innerClassName,
}: {
  children: React.ReactNode
  className?: string
  id?: string
  innerClassName?: string
}) {
  return (
    <section id={id} className={twMerge("w-full", className)}>
      <div className={twMerge("mx-auto w-full max-w-7xl px-6 py-24 md:px-12 md:py-32", innerClassName)}>{children}</div>
    </section>
  )
}
