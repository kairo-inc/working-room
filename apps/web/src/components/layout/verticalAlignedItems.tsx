import clsx from "clsx"
import { ComponentPropsWithoutRef, Fragment, ReactNode } from "react"

type Item = {
  label: ReactNode | string
  value: ReactNode | string
}

export type VerticalAlignedItemsProps = ComponentPropsWithoutRef<"div"> & {
  items: Item[]
}

export const VerticalAlignedItems = ({ items, className, ...props }: VerticalAlignedItemsProps) => {
  const labelClassName = "font-normal text-sm text-muted-foreground"
  const valueClassName = "text-sm text-foreground"
  return (
    <div className={clsx("grid grid-cols-[auto_1fr] gap-2 gap-x-4 text-base", className)} {...props}>
      {items.map((item, index) => (
        <Fragment key={index}>
          <div className={labelClassName}>{item.label}</div>
          <div className={valueClassName}>{item.value}</div>
        </Fragment>
      ))}
    </div>
  )
}
