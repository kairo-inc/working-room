import clsx from "clsx"
import { ComponentPropsWithoutRef, Fragment, ReactNode } from "react"

type Item = {
  values: (ReactNode | string)[]
}

export type HorizontalAlignedItemsProps = ComponentPropsWithoutRef<"div"> & {
  header: string[]
  items: Item[]
}

export const HorizontalAlignedItems = ({ header, items, className, ...props }: HorizontalAlignedItemsProps) => {
  const labelClassName = "font-normal text-sm text-muted-foreground"
  const valueClassName = "text-sm text-foreground"
  return (
    <div className={clsx("grid grid-cols-[auto_1fr] gap-2 gap-x-4 text-base", className)} {...props}>
      {header.map((item, index) => (
        <Fragment key={index}>
          <div className={labelClassName}>{item}</div>
        </Fragment>
      ))}
      {items.map((item, index) => (
        <Fragment key={index}>
          {item.values.map((value, valueIndex) => (
            <div key={valueIndex} className={valueClassName}>
              {value}
            </div>
          ))}
        </Fragment>
      ))}
    </div>
  )
}
