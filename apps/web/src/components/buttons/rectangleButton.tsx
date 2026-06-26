import { type VariantProps, cva } from "class-variance-authority"
import clsx from "clsx"
import { useRouter } from "next/router"
import { type MouseEvent, type ReactNode, forwardRef } from "react"

import { LoadingIndicator } from "../indicator"

const variants = cva("rounded-md border transition-colors duration-200 inline-flex items-center justify-center text-sm", {
  variants: {
    variant: {
      default: "cursor-pointer border-transparent bg-primary text-primary-foreground hover:bg-primary/70",
      defaultOutline: "cursor-pointer border-primary bg-transparent text-primary hover:bg-primary/10",
      destructive: "cursor-pointer border-transparent bg-destructive text-destructive-foreground hover:bg-destructive/90",
      destructiveOutline: "cursor-pointer border-destructive bg-transparent text-destructive hover:bg-destructive/10",
      disabled: "cursor-not-allowed border-transparent bg-disabled text-disabled-foreground",
      // Status variants.
      approve: "cursor-pointer border-transparent bg-success text-success-foreground hover:bg-success/80",
      notApprove: "cursor-pointer border-transparent bg-muted text-muted-foreground hover:bg-muted/80 line-through",
      reject: "cursor-pointer border-transparent bg-destructive text-destructive-foreground hover:bg-destructive/80",
      notReject: "cursor-pointer border-transparent bg-muted text-muted-foreground hover:bg-muted/80 line-through",
    },
    size: {
      default: "px-4 h-10",
      sm: "px-3 h-8",
      lg: "px-5 h-12",
    },
  },
  defaultVariants: {
    variant: "default",
    size: "default",
  },
})

export interface RectangleButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof variants> {
  children: ReactNode
  href?: string
  loading?: boolean
  icon?: ReactNode
}

export const RectangleButton = forwardRef<HTMLButtonElement, RectangleButtonProps>(
  ({ children, variant, size, className, disabled, loading, href, icon, onClick, ...props }, ref) => {
    const router = useRouter()
    const isDisabled = Boolean(disabled || loading)
    const resolvedVariant = isDisabled ? "disabled" : variant

    const content = (
      <div className="flex min-w-12 items-center justify-center whitespace-nowrap">
        {icon && <div className="-translate-x-1">{icon}</div>}
        {children}
      </div>
    )

    // Render the final layout invisibly while loading so the button size stays stable.
    const loader = (
      <div className="relative">
        <LoadingIndicator className="absolute inset-0 m-auto" />
        <div className="invisible">{content}</div>
      </div>
    )

    const handleClick = (event: MouseEvent<HTMLButtonElement>) => {
      onClick?.(event)
      if (!event.defaultPrevented && href) {
        void router.push(href)
      }
    }

    return (
      <button
        type="button"
        className={clsx(variants({ variant: resolvedVariant, size }), className)}
        disabled={isDisabled}
        onClick={handleClick}
        ref={ref}
        {...props}
      >
        {loading ? loader : content}
      </button>
    )
  }
)

RectangleButton.displayName = "RectangleButton"
