import clsx from "clsx"
import { ComponentPropsWithoutRef, ReactElement } from "react"

import { SectionTitle } from "./title"

type SectionProps = ComponentPropsWithoutRef<"div"> & {
  title?: string
  tail?: ReactElement
}

export const Section = ({ title, tail, className, children }: SectionProps) => {
  return (
    <div className={clsx("w-full", className)}>
      <SectionTitle title={title} tail={tail} />
      <div className="bg-card rounded-md p-4">{children}</div>
    </div>
  )
}
