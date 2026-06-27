import { type VariantProps, cva } from "class-variance-authority"
import { type ComponentPropsWithoutRef, type ReactNode, forwardRef } from "react"

const variants = cva("cursor-pointer inline-flex items-center justify-center", {
  variants: {
    variant: {
      default: "text-muted-foreground hover:text-primary transition-colors",
    },
    size: {
      sm: "h-4 w-4",
      default: "h-8 w-8",
      lg: "h-10 w-10",
    },
  },
  defaultVariants: {
    variant: "default",
    size: "default",
  },
})

type IconButtonProps = ComponentPropsWithoutRef<"button"> & {
  icon: ReactNode
} & VariantProps<typeof variants>

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(({ icon, variant, size, className, ...rest }, ref) => {
  return (
    <button type="button" className={variants({ variant, size, className })} ref={ref} {...rest}>
      {icon}
    </button>
  )
})

IconButton.displayName = "IconButton"
