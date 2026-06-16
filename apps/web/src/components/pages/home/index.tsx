import dayjs from "dayjs"
import { Plus, Trash2 } from "lucide-react"
import { useRouter } from "next/router"
import { useEffect } from "react"

import { IconButton } from "../../../components/buttons/iconButton"
import { RectangleButton } from "../../../components/buttons/rectangleButton"
import { BodyLayout } from "../../../components/layout/body"
import { PageLayout, ScrollableContainerId } from "../../../components/layout/page"
import { useChatDeleteModal } from "../../../components/modals/chatDelete"
import { useChatGetList } from "../../../hooks/trpc/chat"
import { L } from "../../../localization"
import { Route } from "../../../route"
import { AppMessageContentText } from "../../../types/message"

const Placeholder = () => {
  const router = useRouter()
  return (
    <div>
      <RectangleButton onClick={() => router.push(Route.chat())}>{L.home.startFirstChat}</RectangleButton>
    </div>
  )
}

const StartChatButton = () => {
  const router = useRouter()
  return (
    <RectangleButton icon={<Plus size={20} />} onClick={() => router.push(Route.chat())}>
      {L.home.newChat}
    </RectangleButton>
  )
}

export interface PageHomeProps extends React.HTMLAttributes<HTMLDivElement> {}

export const PageHome = ({}: PageHomeProps) => {
  const { data, fetchNextPage, isPending, refetch, hasNextPage } = useChatGetList({ sortBy: "updatedAt", sortDirection: "desc" })
  const { show: showDeleteModal, modal: DeleteModal } = useChatDeleteModal()

  const chatList = data?.pages.flatMap((page) => page.data) || []
  const showPlaceholder = chatList.length === 0 && !isPending

  useEffect(() => {
    const handleScroll = () => {
      const scrollElement = document.getElementById(ScrollableContainerId)
      if (!scrollElement) return
      const { scrollTop, scrollHeight, clientHeight } = scrollElement
      if (scrollTop + clientHeight >= scrollHeight - 10) {
        if (hasNextPage && !isPending) {
          fetchNextPage()
        }
      }
    }

    document.addEventListener("scroll", handleScroll, true)

    return () => {
      document.removeEventListener("scroll", handleScroll, true)
    }
  }, [hasNextPage])

  return (
    <PageLayout>
      <BodyLayout title={L.home.title} description={L.home.description} tail={!showPlaceholder ? <StartChatButton /> : undefined}>
        <div className="flex min-h-0 w-full flex-col gap-4 py-4">
          {showPlaceholder ? <Placeholder /> : null}
          {chatList.map((chat) => {
            const { lastUserMessage, updatedAt } = chat
            const contents = lastUserMessage?.content || []
            const content = contents.filter((c): c is AppMessageContentText => c.type === "text" && c.text.trim() !== "")[0]?.text
            const updatedAtString = dayjs(updatedAt).format("YYYY-MM-DD HH:mm")
            return (
              <a href={Route.chat(chat.id)} key={chat.id} className="hover:bg-muted bg-card cursor-pointer rounded-md border px-4 py-2">
                <div className="flex flex-col gap-1 truncate">
                  <div className="flex items-center justify-between">
                    <div className="text-muted-foreground text-xs">{updatedAtString}</div>
                    <div>
                      <IconButton
                        icon={<Trash2 size={16} />}
                        onClick={(e) => {
                          e.preventDefault()
                          e.stopPropagation()
                          showDeleteModal({ data: { id: chat.id }, onResolve: () => refetch() })
                        }}
                      />
                    </div>
                  </div>
                  {content && <div>{content}</div>}
                </div>
              </a>
            )
          })}
        </div>
      </BodyLayout>
      {DeleteModal}
    </PageLayout>
  )
}
