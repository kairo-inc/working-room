import { VariantProps, cva } from "class-variance-authority"
import clsx from "clsx"
import { ComponentPropsWithoutRef, ReactElement } from "react"

const variants = cva("px-4 py-1.5 text-sm transition-colors border-b border-border last:border-b-0", {
  variants: {
    variant: {
      default: "text-primary hover:bg-muted cursor-pointer",
      destructive: "text-destructive hover:bg-destructive/10 cursor-pointer",
      disabled: "text-muted-foreground cursor-not-allowed",
    },
  },
  defaultVariants: {
    variant: "default",
  },
})
export type HoverMenuItemData<Action extends string> = {
  label: string
  action: Action
  icon?: ReactElement
  variant?: VariantProps<typeof variants>["variant"]
  disabled?: boolean
}

export type HoverMenuItemProps<Action extends string> = ComponentPropsWithoutRef<"div"> & {
  data: HoverMenuItemData<Action>
}

export const HoverMenuItem = <Action extends string>({ data, className, ...props }: HoverMenuItemProps<Action>) => {
  return (
    <div className={clsx(variants({ variant: data.variant }), className, { "cursor-not-allowed": data.disabled })} {...props}>
      {data.label}
    </div>
  )
}
