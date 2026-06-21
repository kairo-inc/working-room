import { cva } from "class-variance-authority"
import { User } from "lucide-react"
import React from "react"

import { useSetting } from "../contexts/setting"

const variants = cva("text-md flex h-14 cursor-pointer items-center gap-3 pl-5 transition-colors", {
  variants: {
    variant: {
      default: "font-normal text-muted-foreground hover:bg-muted hover:text-foreground",
      selected: "bg-primary/10 font-medium text-primary",
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
      <div className="text-foreground flex items-center justify-center rounded-full text-lg">
        <User size={20} />
      </div>
      <div className="hidden md:block">
        <div className="text-primary text-md font-bold">{name}</div>
        <div className="text-muted-foreground text-xs">{email}</div>
      </div>
    </a>
  )
}
