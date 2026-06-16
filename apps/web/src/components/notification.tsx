import { AlertCircle, AlertTriangle, Info as InfoIcon, X } from "lucide-react"
import type { JSX, PropsWithoutRef } from "react"

import { Info } from "../contexts/notification"

export interface NotificationProps extends PropsWithoutRef<JSX.IntrinsicElements["div"]> {
  show?: boolean
  info: Info
  onCloseClicked?: () => void
}

const levelConfig = {
  info: {
    Icon: InfoIcon,
    bg: "bg-card",
    border: "border-primary",
    text: "text-primary",
    icon: "text-primary",
  },
  error: {
    Icon: AlertCircle,
    bg: "bg-card",
    border: "border-destructive",
    text: "text-destructive",
    icon: "text-destructive",
  },
  warning: {
    Icon: AlertTriangle,
    bg: "bg-card",
    border: "border-warning",
    text: "text-warning",
    icon: "text-warning",
  },
}

export const Notification = ({ show, info, onCloseClicked, ...props }: NotificationProps) => {
  const { title, text, level } = info
  const { Icon, bg, border, text: textColor, icon } = levelConfig[level]
  return (
    <div
      {...props}
      className={`w-md rounded-md border px-4 py-3 shadow-sm transition-all duration-200 ${bg} ${border} ${show ? "translate-x-0 opacity-100" : "translate-x-4 opacity-0"} ${props.className ?? ""}`}
    >
      <div className="flex items-center gap-2">
        <Icon className={`size-4.5 shrink-0 ${icon}`} />
        <span className={`flex-1 text-sm ${textColor} flex-1 font-bold`}>{title}</span>
        {onCloseClicked && (
          <button
            onClick={(e) => {
              e.stopPropagation()
              onCloseClicked()
            }}
            className={`shrink-0 ${textColor} opacity-60 hover:cursor-pointer hover:opacity-100`}
          >
            <X className="size-5" />
          </button>
        )}
      </div>
      <div className={`mt-2 flex-1 text-sm ${textColor} whitespace-pre-wrap`}>{text}</div>
    </div>
  )
}
