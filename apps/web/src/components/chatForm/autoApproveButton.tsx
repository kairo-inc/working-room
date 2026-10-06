import clsx from "clsx"
import { ShieldCheck, ShieldOff } from "lucide-react"
import { useRouter } from "next/router"
import { ComponentPropsWithoutRef } from "react"

import { useNotification } from "../../contexts/notification"
import { useChatEdit } from "../../hooks/trpc/chat"
import { L } from "../../localization"
import { AppChatStatus } from "../../types/chat"

type AutoApproveButtonProps = ComponentPropsWithoutRef<"button"> & {
  chat: AppChatStatus
}

// Switches auto-approve for this Chat. While it is on, Tool calls that require approval run without asking,
// so the "on" state is highlighted to keep it noticeable.
export const AutoApproveButton = ({ chat, className, ...props }: AutoApproveButtonProps) => {
  const router = useRouter()
  const notify = useNotification()
  const { mutateAsync: editChat, isPending } = useChatEdit()
  const isOn = chat.autoApprove

  return (
    <button
      type="button"
      role="switch"
      aria-checked={isOn}
      title={L.chat.autoApproveDescription}
      disabled={isPending}
      className={clsx(
        "inline-flex shrink-0 items-center gap-1 rounded-sm px-1.5 py-0.5 text-xs outline-none hover:cursor-pointer disabled:cursor-not-allowed disabled:opacity-60",
        isOn ? "bg-warning/15 text-warning font-bold" : "text-muted-foreground hover:text-primary",
        className
      )}
      onClick={async () => {
        try {
          await editChat({ id: chat.id, autoApprove: !isOn })
          router.replace(router.asPath)
        } catch (e) {
          notify.error(L.common.error, e.message)
        }
      }}
      {...props}
    >
      {isOn ? <ShieldOff size={14} /> : <ShieldCheck size={14} />}
      {L.chat.autoApprove}: {isOn ? L.chat.autoApproveOn : L.chat.autoApproveOff}
    </button>
  )
}
