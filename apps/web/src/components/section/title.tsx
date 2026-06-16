import clsx from "clsx"
import { ComponentPropsWithoutRef, ReactElement } from "react"

type SectionTitleProps = ComponentPropsWithoutRef<"div"> & {
  tail?: ReactElement
}

export const SectionTitle = ({ title, tail, className }: SectionTitleProps) => {
  return (
    <div className={clsx("mb-4 flex w-full items-center justify-between border-b text-lg font-semibold", className)}>
      <div className="h-8">{title}</div>
      {tail}
    </div>
  )
}
