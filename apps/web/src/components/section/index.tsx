import clsx from "clsx"
import { ComponentPropsWithoutRef, ReactElement } from "react"

import { SectionTitle } from "./title"

type SectionProps = ComponentPropsWithoutRef<"div"> & {
  title?: string
  tail?: ReactElement
  containerClassName?: string
}

export const Section = ({ title, tail, className, containerClassName, children }: SectionProps) => {
  return (
    <div className={clsx("w-full", className)}>
      <SectionTitle title={title} tail={tail} />
      <div className={clsx("bg-card rounded-md p-4", containerClassName)}>{children}</div>
    </div>
  )
}
