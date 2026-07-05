import { handleSsr } from "../../middleware/ssr"
import { Route } from "../../route"
import { getWebAppDiContainer } from "../../server/container"
import { ChatService } from "../../server/services/chatType"
import { ensureQueryOrNull } from "../../utils/queryParser"

export default function InitialChat() {
  return <></>
}

// NOTE: This page is used to create a new chat and redirect to the chat page. It is not rendered on the client side.
// This can cause many empty chats to be created if the user refreshes the page, but implementation of the chat page will be simplified.
export const getServerSideProps = handleSsr({
  fn: async (ctx) => {
    const service = getWebAppDiContainer().resolve<ChatService>("ChatService")
    const workingFolderId = ensureQueryOrNull(ctx, "workingFolderId")
    const chat = await service.create({ workingFolderId: workingFolderId ?? undefined })
    return {
      redirect: { destination: Route.chat(chat.id), permanent: false },
    }
  },
})
