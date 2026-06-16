import { VariantProps, cva } from "class-variance-authority"
import clsx from "clsx"

const variants = cva("w-full flex items-center gap-3 pl-4 py-2.5 transition-colors cursor-pointer border-transparent text-sm", {
  variants: {
    variant: {
      default: "text-muted-foreground hover:bg-muted hover:text-foreground font-normal ",
      selected: "bg-primary/10 text-primary font-medium ",
    },
  },
})

export interface RectangleButtonProps extends React.AnchorHTMLAttributes<HTMLAnchorElement>, VariantProps<typeof variants> {
  label: string
  icon: React.ReactNode
  href?: string
}

export const SideMenuButton = ({ href, label, icon, variant = "default", className, ...props }: RectangleButtonProps) => {
  return (
    <a href={href} className={clsx(variants({ variant: variant }), className)} {...props}>
      {icon}
      {label}
    </a>
  )
}
