import { cva } from "class-variance-authority"
import { User } from "lucide-react"
import React from "react"

import { useSetting } from "../contexts/setting"

const variants = cva("flex items-center gap-3 pl-4 py-2.5 text-md transition-colors cursor-pointer", {
  variants: {
    variant: {
      default: "text-muted-foreground hover:bg-muted hover:text-foreground font-normal",
      selected: "bg-primary/10 text-primary font-medium",
    },
  },
})

interface AvatarProps extends React.HTMLAttributes<HTMLAnchorElement> {
  variant?: "default" | "selected"
  href?: string
}

export const Avatar = ({ variant = "default", className, ...props }: AvatarProps) => {
  const { name, email } = useSetting()

  return (
    <a className={variants({ variant, className })} {...props}>
      <div className="bg-foreground text-primary-foreground flex h-9 w-9 items-center justify-center rounded-full text-lg">
        <User className="text-sm" />
      </div>
      <div>
        <div className="text-primary text-md font-bold">{name}</div>
        <div className="text-muted-foreground text-xs">{email}</div>
      </div>
    </a>
  )
}
