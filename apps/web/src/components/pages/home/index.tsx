import { Plus, SearchIcon } from "lucide-react"
import { useRouter } from "next/router"
import { useEffect, useState } from "react"

import { RectangleButton } from "../../../components/buttons/rectangleButton"
import { BodyLayout } from "../../../components/layout/body"
import { PageLayout, ScrollableContainerId } from "../../../components/layout/page"
import { useChatDeleteModal } from "../../../components/modals/chatDelete"
import { useChatGetList } from "../../../hooks/trpc/chat"
import { L } from "../../../localization"
import { Route } from "../../../route"
import { TextForm } from "../../forms/textForm"
import { ChatItem } from "./chatItem"

const Placeholder = () => {
  return <div className="text-muted-foreground/80 flex h-14 items-end justify-center text-lg font-bold">{L.home.chatNotFound}</div>
}

const FirstPlaceholder = () => {
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
  const [chatSearchText, setChatSearchText] = useState<string | undefined>()
  const { data, fetchNextPage, isPending, refetch, hasNextPage } = useChatGetList({
    sortBy: "updatedAt",
    sortDirection: "desc",
    searchText: chatSearchText,
  })
  const { show: showDeleteModal, modal: DeleteModal } = useChatDeleteModal()

  const chatList = data?.pages.flatMap((page) => page.data) || []
  const showFirstPlaceholder = chatList.length === 0 && !isPending && !chatSearchText?.trim()
  const showPlaceholder = chatList.length === 0 && !isPending && !!chatSearchText?.trim()

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
      <BodyLayout title={L.home.title} description={L.home.description} tail={!showFirstPlaceholder ? <StartChatButton /> : undefined}>
        <div className="flex min-h-0 w-full flex-col gap-4 pb-4">
          {showFirstPlaceholder ? <FirstPlaceholder /> : null}
          {!showFirstPlaceholder && (
            <TextForm
              noError
              placeholder={L.home.searchChatPlaceholder}
              icon={<SearchIcon size={20} />}
              onChange={(e) => setChatSearchText(e.target.value)}
            />
          )}
          {showPlaceholder ? <Placeholder /> : null}
          {chatList.map((chat) => (
            <ChatItem
              key={chat.id}
              item={chat}
              onRemoveClick={(chatId) => showDeleteModal({ data: { id: chatId }, onResolve: () => refetch() })}
            />
          ))}
        </div>
      </BodyLayout>
      {DeleteModal}
    </PageLayout>
  )
}
