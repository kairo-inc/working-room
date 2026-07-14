import { useRouter } from "next/router"

import SlackLogo from "../../../public/slack.svg"
import { useNotification } from "../../contexts/notification"
import { useOauthClientDisconnect } from "../../hooks/trpc/oauth"
import { L } from "../../localization"
import { AppOauthClientSlack } from "../../types/oauthClient"
import { RectangleButton } from "../buttons/rectangleButton"
import { Modal, ModalBaseArgs, ModalProps, useModal } from "./modal"

type Args = ModalBaseArgs & {
  data: Pick<AppOauthClientSlack, "id" | "provider" | "slackTeamName">
}

type OauthClientDisconnectModalProps = ModalProps & Args

export const OauthClientDisconnectModal = ({ show, onClose, data, onReject, onResolve }: OauthClientDisconnectModalProps) => {
  const router = useRouter()
  const notify = useNotification()
  const { mutateAsync: disconnect, isPending } = useOauthClientDisconnect()

  return (
    <Modal show={show} onClose={onClose} title={L.modal.oauthClientDisconnect.title}>
      <div className="mt-4 text-sm">
        {L.modal.oauthClientDisconnect.confirm}
        <div className="bg-muted my-2 flex items-center gap-4 truncate rounded-md px-3 py-2">
          <SlackLogo className="h-5" />
          {data.slackTeamName}
        </div>
        {L.common.cannotBeUndone}
        <div className="mt-6 flex justify-end gap-4">
          <RectangleButton
            loading={isPending}
            variant="destructive"
            onClick={async () => {
              try {
                await disconnect({ id: data.id, provider: data.provider })
                onClose?.()
                router.replace(router.asPath)
                onResolve?.()
              } catch (error) {
                notify.error(L.modal.oauthClientDisconnect.failed, error.message)
                onReject?.()
              }
            }}
          >
            {L.common.ok}
          </RectangleButton>
          <RectangleButton onClick={onClose} disabled={isPending} variant="defaultOutline">
            {L.common.cancel}
          </RectangleButton>
        </div>
      </div>
    </Modal>
  )
}

export const useOauthClientDisconnectModal = () => {
  return useModal<Args>(OauthClientDisconnectModal)
}
