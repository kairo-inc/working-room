import { useEffect, useRef, useState } from "react"
import { Form, FormSpy } from "react-final-form"

import { MimeType } from "@wr/shared"

import { LoadingIndicator } from "../../../components/indicator"
import { BodyLayout } from "../../../components/layout/body"
import { PageLayout } from "../../../components/layout/page"
import { useNotification } from "../../../contexts/notification"
import { useChatGetMessages, useChatGetMessagesSetData, useChatRunSingleLoop } from "../../../hooks/trpc/chat"
import { L } from "../../../localization"
import { AppChatNeedApproval, AppChatStatus } from "../../../types/chat"
import {
  AppAssistantMessage,
  AppMessageContentFileRef,
  AppMessageContentProceededFile,
  AppMessageContentText,
  AppUserMessage,
} from "../../../types/message"
import { AppStreamEvent } from "../../../types/stream"
import { elementIds } from "../../elementId"
import { ApprovalMessage, ChatInputApprovalSubmitFn, ChatInputApprovalType } from "./approvalInput"
import { ChatInputForm, ChatInputFormSubmitFn, FileUploadItemMeta } from "./formInput"
import { ChatMessage } from "./message"

const USER_LOCAL_MESSAGE_ID = "local"
const STREAMING_MESSAGE_ID = "streaming"

export interface PageChatProps extends React.HTMLAttributes<HTMLDivElement> {
  data: AppChatStatus
}

const Placeholder = () => {
  return (
    <div className="text-muted-foreground/60 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 transform text-4xl font-bold whitespace-nowrap select-none">
      {L.chat.placeholder}
    </div>
  )
}

export const PageChat = ({ data }: PageChatProps) => {
  const notify = useNotification()
  const [isPending, setIsPending] = useState(false)
  const chunkBuffer = useRef("")
  const [shouldScrollToBottom, setShouldScrollToBottom] = useState(true)
  const [needApprovals, setNeedApprovals] = useState<AppChatNeedApproval[]>(data.needApprovals || [])
  const [toolCall, setToolCall] = useState<string[]>([])
  const [currentHeight, setCurrentHeight] = useState<number>(0)

  const runChat = useChatRunSingleLoop()
  const setMessages = useChatGetMessagesSetData(data.id, { sortBy: "sequence", sortDirection: "desc" })
  const { refetch, data: messages, hasNextPage, fetchNextPage } = useChatGetMessages(data.id, { sortBy: "sequence", sortDirection: "desc" })

  const appendLocalUserMessage = (message: string, fileMeta: AppMessageContentFileRef[]) => {
    const newUserMessage: AppUserMessage = {
      id: USER_LOCAL_MESSAGE_ID,
      role: "user",
      content: [
        { type: "text", text: message },
        ...fileMeta.map<AppMessageContentFileRef>((f) => ({
          type: "file-ref",
          descId: f.descId,
          blobHash: f.blobHash,
          mimeType: f.mimeType as MimeType,
        })),
      ],
    }
    setMessages((old) => {
      if (!old || old.pages.length === 0) return old
      const [firstPage, ...restPages] = old.pages
      return {
        ...old,
        pages: [
          {
            ...firstPage!,
            data: [newUserMessage, ...firstPage!.data],
          },
          ...(restPages ?? []),
        ],
      }
    })
  }

  const appendLocalAssistantMessage = () => {
    const newAssistantMessage: AppAssistantMessage = {
      id: STREAMING_MESSAGE_ID,
      role: "assistant",
      content: [],
    }
    setMessages((old) => {
      if (!old || old.pages.length === 0) return old
      const [firstPage, ...restPages] = old.pages
      return {
        ...old,
        pages: [
          {
            ...firstPage!,
            data: [newAssistantMessage, ...firstPage!.data],
          },
          ...(restPages ?? []),
        ],
      }
    })
  }

  const appendStreamedMessage = (chunk: string) => {
    setMessages((old) => {
      if (!old) return old
      return {
        ...old,
        pages: old.pages.map((page) => {
          const streamingMessage = page.data.find((m) => m.id === STREAMING_MESSAGE_ID && m.role === "assistant")
          if (!streamingMessage || streamingMessage.role !== "assistant") return page

          const streamingAssistantMessage: AppAssistantMessage = streamingMessage
          const streamingTextContents = streamingAssistantMessage.content.filter((c): c is AppMessageContentText => c.type === "text")
          const streamingOtherContent = streamingAssistantMessage.content.filter(
            (c): c is Exclude<typeof c, AppMessageContentText> => c.type !== "text"
          )
          const otherMessages = page.data.filter((m) => m.id !== STREAMING_MESSAGE_ID)
          const streamingTextContent = streamingTextContents[0] ?? {
            type: "text",
            text: "",
          }
          return {
            ...page,
            data: [
              {
                ...streamingAssistantMessage,
                content: [
                  {
                    ...streamingTextContent,
                    text: chunk,
                  },
                  ...streamingOtherContent,
                ],
              },
              ...otherMessages,
            ],
          }
        }),
      }
    })
  }

  const chatMessages = (messages?.pages.map((page) => page.data).flat() || []).reverse()
  const showPlaceholder = chatMessages.length === 0 && !isPending

  const focusOnChatInput = () => {
    const textarea = document.getElementById("chatTextArea")
    if (textarea) {
      textarea.focus()
    }
  }

  const scrollToBottom = (behavior: ScrollBehavior = "smooth", force?: boolean) => {
    const scrollableContainer = document.getElementById(elementIds.scrollableContainer)
    if (scrollableContainer && (force || shouldScrollToBottom)) {
      scrollableContainer.scrollTo({ top: scrollableContainer.scrollHeight, behavior })
    }
  }

  useEffect(() => {
    // Scroll the first time.
    if (chatMessages.length > 0) {
      setTimeout(() => {
        scrollToBottom()
      }, 300)
      setCurrentHeight(document.getElementById(elementIds.scrollableContainer)?.scrollHeight || 0)
    }
    focusOnChatInput()
  }, [chatMessages.length === 0])

  useEffect(() => {
    const dom = document.getElementById(elementIds.scrollableContainer)
    const handleScroll = async () => {
      // Scroll to fetch more messages when scrolled to top.
      const isAtTop = dom?.scrollTop === 0
      if (isAtTop && hasNextPage) {
        // Stop scrolling inertia by setting scrollTop to 1, then reset it back to 0 after fetching next page.
        // This prevents the scroll position from jumping around when new messages are loaded.
        dom.scrollTop = 0
        dom.style.overflowY = "hidden"
        requestAnimationFrame(() => {
          dom.style.overflowY = "auto"
        })
        setCurrentHeight(document.getElementById(elementIds.scrollableContainer)?.scrollHeight || 0)
        await fetchNextPage()
      }

      // Toggle shouldScrollToBottom state based on scroll position. If the user scrolls up, disable auto scroll to bottom. If the user scrolls to bottom, enable auto scroll to bottom.
      const isAtBottom = !!dom && dom.scrollHeight - dom.scrollTop === dom.clientHeight
      setShouldScrollToBottom(isAtBottom)
    }
    dom?.addEventListener("scroll", handleScroll)
    return () => {
      dom?.removeEventListener("scroll", handleScroll)
    }
  }, [hasNextPage])

  // Check scroll position when new messages are loaded. If the user is at the top, keep them at the top. Otherwise, scroll to bottom.
  useEffect(() => {
    if (messages?.pages.length && currentHeight) {
      const dom = document.getElementById(elementIds.scrollableContainer)
      if (dom) {
        const newHeight = dom.scrollHeight
        const newPosition = newHeight - currentHeight
        dom.scrollTop = newPosition
        setCurrentHeight(newHeight)
      }
    }
  }, [messages?.pages.length])

  const handleStreamedResponse = async (readable: AsyncGenerator<AppStreamEvent, void, unknown>) => {
    let counter = 0
    chunkBuffer.current = ""
    const inrollment = setInterval(() => {
      appendStreamedMessage(chunkBuffer.current)
      if (counter++ % 3 === 0) {
        scrollToBottom("smooth")
      }
    }, 100)

    // Parse events.
    for await (const data of readable) {
      if (data.type === "text") {
        chunkBuffer.current += data.text
      } else if (data.type === "sub-agent-start") {
        setToolCall((prev) => (prev.includes(data.agentName) ? prev : [...prev, data.agentName]))
      } else if (data.type === "sub-agent-end") {
        setToolCall((prev) => prev.filter((name) => name !== data.agentName))
      } else if (data.type === "tool-call-start") {
        setToolCall((prev) => (prev.includes(data.toolName) ? prev : [...prev, data.toolName]))
      } else if (data.type === "tool-call-end") {
        setToolCall((prev) => prev.filter((name) => name !== data.toolName))
      } else if (data.type === "chat-request-approval") {
        const { needApprovals: newApprovals } = data
        setNeedApprovals(newApprovals)
      } else if (data.type === "tool-call-failed") {
        // TODO: Handle tool call failure, e.g. show error message in UI.
        console.error(`Tool call failed: ${data.toolName}`, data.error)
      } else if (data.type === "error") {
        notify.error(L.common.error, data.message)
      }
    }
    setIsPending(false)
    clearInterval(inrollment)
    await refetch()
    setToolCall([])
    scrollToBottom("smooth")
  }

  const onSubmit: ChatInputFormSubmitFn = async (values, form) => {
    const chatId = data.id
    const fileMeta =
      values?.fileUpload
        ?.map((f) => f.meta)
        .filter((f): f is FileUploadItemMeta => !!f)
        .map<AppMessageContentFileRef>((f) => ({
          type: "file-ref",
          descId: f.descId,
          blobHash: f.blobHash,
          mimeType: f.mimeType as MimeType,
        })) || []
    const descIds = fileMeta.map((f) => f.descId)

    appendLocalUserMessage(values.chatMessage, fileMeta)
    appendLocalAssistantMessage()

    focusOnChatInput()
    setIsPending(true)
    form.reset()

    scrollToBottom("smooth", true)

    const readable = runChat({ id: chatId, message: values.chatMessage, resources: { descIds } })
    await handleStreamedResponse(readable)
  }

  const onApprovalSubmit: ChatInputApprovalSubmitFn = async (values, form) => {
    const chatId = data.id
    const approvals = Object.entries(values).map(([approvalId, isApproved]) => ({ approvalId, isApproved: !!isApproved }))

    appendLocalAssistantMessage()

    focusOnChatInput()
    setIsPending(true)
    form.reset()
    setNeedApprovals([])

    const readable = runChat({ id: chatId, approvals })
    await handleStreamedResponse(readable)
  }

  return (
    <PageLayout containerClassName="!pb-0">
      <BodyLayout className="max-w-4xl">
        <div className="relative min-h-0 w-full flex-1 pb-8">
          {chatMessages.map((message) => {
            const role = message.role
            const content = message.content.filter((c): c is AppMessageContentText => c.type === "text").map((c) => c.text)
            if (role === "user") {
              const fileMeta = message.content.filter((c): c is AppMessageContentFileRef => c.type === "file-ref")
              return <ChatMessage key={message.id} role={role} text={content[0] ?? ""} fileMeta={fileMeta} />
            } else if (role === "assistant") {
              const proceededFiles = message.content.filter((c): c is AppMessageContentProceededFile => c.type === "proceeded-file")
              return <ChatMessage key={message.id} role={role} text={content[0] ?? ""} proceededFiles={proceededFiles} />
            }
          })}
          {isPending && (
            <div className="text-primary flex h-10 items-center justify-start gap-4 p-4 pl-8">
              <LoadingIndicator />
              {toolCall.length > 0 && <div className="text-muted-foreground text-sm">Calling {toolCall.join(", ")}</div>}
            </div>
          )}
          {showPlaceholder && <Placeholder />}
          {needApprovals.length > 0 && (
            <Form<ChatInputApprovalType>
              onSubmit={onApprovalSubmit}
              render={({ handleSubmit, form }) => (
                <form onSubmit={handleSubmit}>
                  {needApprovals.map((ap) => (
                    <ApprovalMessage
                      key={ap.approvalId}
                      needApproval={ap}
                      onDecide={(approvalId, approval) => {
                        form.change(approvalId, approval === "approve")
                      }}
                    />
                  ))}
                  <FormSpy
                    subscription={{ values: true }}
                    onChange={async ({ values }) => {
                      if (Object.keys(values).length === needApprovals.length) {
                        await onApprovalSubmit(values, form)
                      }
                    }}
                  />
                </form>
              )}
            />
          )}
        </div>
        {needApprovals.length === 0 && <ChatInputForm onSubmit={onSubmit} chat={data} isDisabled={isPending} />}
      </BodyLayout>
    </PageLayout>
  )
}
