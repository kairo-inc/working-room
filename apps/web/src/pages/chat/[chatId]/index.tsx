import { PageChat, PageChatProps } from "../../../components/pages/chat"
import { handleSsr } from "../../../middleware/ssr"
import { getWebAppDiContainer } from "../../../server/container"
import { ChatService } from "../../../server/services/chatType"
import { ensureQuery } from "../../../utils/queryParser"

export default function Chat(props: PageChatProps) {
  return (
    <>
      <title>Chat</title>
      <PageChat {...props} />
    </>
  )
}

export const getServerSideProps = handleSsr<PageChatProps>({
  fn: async (ctx) => {
    const id = ensureQuery(ctx, "chatId")
    const server = getWebAppDiContainer().resolve<ChatService>("ChatService")
    const data = await server.getStatus({ id })
    return { props: { data } }
  },
})
