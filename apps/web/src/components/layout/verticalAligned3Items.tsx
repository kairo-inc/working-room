import clsx from "clsx"
import { ComponentPropsWithoutRef, Fragment, ReactNode } from "react"

type Item = {
  col1: ReactNode | string
  col2: ReactNode | string
  col3: ReactNode | string
}

export type VerticalAligned3ItemsProps = ComponentPropsWithoutRef<"div"> & {
  items: Item[]
}

export const VerticalAligned3Items = ({ items, className, ...props }: VerticalAligned3ItemsProps) => {
  const labelClassName = "font-normal flex items-center"
  const valueClassName = "text-foreground flex items-center"
  return (
    <div className={clsx("grid w-full grid-cols-[auto_1fr_auto] gap-2 gap-x-4 text-base", className)} {...props}>
      {items.map((item, index) => (
        <Fragment key={index}>
          <div className={labelClassName}>{item.col1}</div>
          <div className={valueClassName}>{item.col2}</div>
          <div className={valueClassName}>{item.col3}</div>
        </Fragment>
      ))}
    </div>
  )
}
