import { type VariantProps, cva } from "class-variance-authority"
import clsx from "clsx"
import { ComponentPropsWithoutRef, type ReactNode } from "react"

import SlackLogo from "../../../public/slack.svg"
import { LoadingIndicator } from "../indicator"

const variants = cva("rounded-md border transition-colors duration-200 inline-flex items-center justify-center text-sm", {
  variants: {
    variant: {
      default: "cursor-pointer border-transparent bg-primary text-primary-foreground hover:bg-primary/70",
      disabled: "cursor-not-allowed border-transparent bg-disabled text-disabled-foreground",
    },
    size: {
      default: "px-2 h-10 sm:px-4",
      sm: "px-2 h-8 sm:px-3",
      lg: "px-2 h-12 sm:px-5",
    },
  },
  defaultVariants: {
    variant: "default",
    size: "default",
  },
})

type BaseLogoButtonProps = ComponentPropsWithoutRef<"button"> &
  VariantProps<typeof variants> & {
    href?: string
    loading?: boolean
    icon?: ReactNode
  }

const BaseLogoButton = ({ children, variant, size, className, disabled, loading, href, icon, ...props }: BaseLogoButtonProps) => {
  const isDisabled = Boolean(disabled || loading)
  const resolvedVariant = isDisabled ? "disabled" : variant

  const content = (
    <div className="flex min-w-12 items-center justify-center gap-1 whitespace-nowrap">
      {icon && <div>{icon}</div>}
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

  return (
    <button type="button" className={clsx(variants({ variant: resolvedVariant, size }), className)} disabled={isDisabled} {...props}>
      {loading ? loader : content}
    </button>
  )
}

export const SlackLogoButton = ({ variant, size, className, disabled, loading, href, icon, ...props }: BaseLogoButtonProps) => {
  return (
    <BaseLogoButton
      variant={variant}
      size={size}
      className={clsx(className, "gap-2")}
      disabled={disabled}
      loading={loading}
      href={href}
      {...props}
    >
      <SlackLogo style={{ height: size === "sm" ? 16 : 20 }} />
    </BaseLogoButton>
  )
}
