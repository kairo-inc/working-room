import { Edit } from "lucide-react"
import { useRouter } from "next/router"

import { IconButton } from "../../../components/buttons/iconButton"
import { RectangleButton } from "../../../components/buttons/rectangleButton"
import { BodyLayout } from "../../../components/layout/body"
import { PageLayout } from "../../../components/layout/page"
import { useOauthClientDisconnectModal } from "../../../components/modals/oauthClientDisconnect"
import { useUserEditModal } from "../../../components/modals/userEdit"
import { Section } from "../../../components/section"
import { useNotification } from "../../../contexts/notification"
import { useAuthSignout } from "../../../hooks/trpc/auth"
import { L } from "../../../localization"
import { Route } from "../../../route"
import { AppOauthClient, AppOauthClientSlack } from "../../../types/oauthClient"
import { AppUserSetting } from "../../../types/user"
import { SlackLogoButton } from "../../buttons/logoButton"
import { VerticalAligned3Items } from "../../layout/verticalAligned3Items"
import { VerticalAlignedItems } from "../../layout/verticalAlignedItems"

const availableOauthClients = ["slack"] as const

export interface PageAccountProps extends React.HTMLAttributes<HTMLDivElement> {
  data: AppUserSetting
  oauthClients: AppOauthClient[]
}

export const PageAccount = ({ data, oauthClients }: PageAccountProps) => {
  const router = useRouter()
  const notify = useNotification()
  const { mutateAsync: signout, isPending } = useAuthSignout()
  const { show: showUserEditModal, modal: UserEditModal } = useUserEditModal()
  const { show: showOauthClientDisconnectModal, modal: OauthClientDisconnectModal } = useOauthClientDisconnectModal()
  const editButton = <IconButton size="default" icon={<Edit />} onClick={() => showUserEditModal({ data })} />

  return (
    <PageLayout>
      <BodyLayout title={L.account.title} description={L.account.description} containerClassName="gap-10">
        <Section title={L.account.userData.title} tail={editButton}>
          <VerticalAlignedItems
            items={[
              { label: L.account.userData.name, value: data.name },
              { label: L.account.userData.email, value: data.email },
              { label: L.account.userData.role, value: data.role },
            ]}
          />
        </Section>
        <Section title={L.account.oauthClient.title}>
          <VerticalAligned3Items
            items={availableOauthClients.map((p) => {
              const client = oauthClients.find((c) => c.provider === p)
              if (!client) {
                return {
                  col1: (
                    <SlackLogoButton onClick={() => open(Route.oauthAuthorize(p), "_blank")} loading={isPending} disabled={isPending} />
                  ),
                  col2: <span className="text-muted-foreground text-sm">{L.account.oauthClient.notConnected}</span>,
                  col3: "",
                }
              } else {
                const slackClient = client as AppOauthClientSlack
                return {
                  col1: <SlackLogoButton onClick={() => open(Route.oauthAuthorize(p), "_blank")} loading={isPending} disabled />,
                  col2: <span className="text-foreground text-sm">{slackClient.slackTeamName}</span>,
                  col3: (
                    <RectangleButton
                      variant="destructiveOutline"
                      onClick={() => showOauthClientDisconnectModal({ data: slackClient })}
                      disabled={isPending}
                    >
                      {L.account.oauthClient.disconnect}
                    </RectangleButton>
                  ),
                }
              }
            })}
          />
        </Section>
        <Section title={L.account.signout.title}>
          <div className="grid grid-cols-[auto_1fr] gap-2 gap-x-4 text-base">
            <RectangleButton
              size="default"
              variant="defaultOutline"
              onClick={async () => {
                try {
                  await signout()
                  router.reload()
                } catch (error) {
                  notify.error(L.account.signout.error, error.message)
                }
              }}
              loading={isPending}
            >
              {L.account.signout.button}
            </RectangleButton>
          </div>
        </Section>
      </BodyLayout>
      {UserEditModal}
      {OauthClientDisconnectModal}
    </PageLayout>
  )
}
