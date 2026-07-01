import { VariantProps, cva } from "class-variance-authority"
import clsx from "clsx"

const variants = cva("w-full flex h-12 cursor-pointer items-center gap-3 border-transparent pl-5 text-sm transition-colors", {
  variants: {
    variant: {
      default: "font-normal text-muted-foreground hover:bg-muted hover:text-foreground ",
      selected: "bg-primary/10 font-medium text-primary",
    },
  },
})

export interface RectangleButtonProps extends React.AnchorHTMLAttributes<HTMLAnchorElement>, VariantProps<typeof variants> {
  label: string
  icon: React.ReactNode
  href?: string
  showLabel?: boolean
}

export const SideMenuButton = ({ href, label, icon, variant = "default", className, showLabel, ...props }: RectangleButtonProps) => {
  return (
    <a href={href} className={clsx(variants({ variant: variant }), className)} {...props}>
      {icon}
      <div className={showLabel ? "block" : "hidden lg:block"}>{label}</div>
    </a>
  )
}
