import dayjs from "dayjs"
import { Trash2 } from "lucide-react"
import { ComponentPropsWithoutRef } from "react"

import { L } from "../../../localization"
import { Route } from "../../../route"
import { AppChat } from "../../../types/chat"
import { AppMessageContentText } from "../../../types/message"
import { IconButton } from "../../buttons/iconButton"
import { FileIconSm } from "../../file/item"

type ChatItemProps = ComponentPropsWithoutRef<"div"> & {
  item: AppChat
  onRemoveClick?: (chatId: string) => void
}

export const ChatItem = ({ item, onRemoveClick, ...rest }: ChatItemProps) => {
  const { lastUserMessage, updatedAt, workingFolder } = item
  const contents = lastUserMessage?.content || []
  const content = contents.filter((c): c is AppMessageContentText => c.type === "text" && c.text.trim() !== "")[0]?.text
  const updatedAtString = dayjs(updatedAt).format("YYYY-MM-DD HH:mm")
  return (
    <a href={Route.chat(item.id)} key={item.id} className="hover:bg-muted bg-card cursor-pointer rounded-md border px-4 py-2">
      <div className="flex flex-col gap-1 truncate">
        <div className="flex items-center justify-between">
          <div className="text-muted-foreground text-xs">{updatedAtString}</div>
          <div>
            <IconButton
              icon={<Trash2 size={16} />}
              onClick={(e) => {
                e.preventDefault()
                e.stopPropagation()
                onRemoveClick?.(item.id)
              }}
            />
          </div>
        </div>
        <div className="truncate">{content}</div>
        <div className="flex items-center justify-between gap-1 pt-2">
          <span className="text-muted-foreground inline-flex items-center justify-start gap-1 text-xs">
            <FileIconSm type="inode/directory" /> {workingFolder?.name ?? L.chat.privateFolder}
          </span>
          <div>{/* shared flag will be here. */}</div>
        </div>
      </div>
    </a>
  )
}
