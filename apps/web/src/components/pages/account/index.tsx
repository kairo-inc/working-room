import { Edit } from "lucide-react"
import { useRouter } from "next/router"

import { IconButton } from "../../../components/buttons/iconButton"
import { RectangleButton } from "../../../components/buttons/rectangleButton"
import { BodyLayout } from "../../../components/layout/body"
import { PageLayout } from "../../../components/layout/page"
import { useUserEditModal } from "../../../components/modals/userEdit"
import { Section } from "../../../components/section"
import { useNotification } from "../../../contexts/notification"
import { useAuthSignout } from "../../../hooks/api/auth"
import { L } from "../../../localization"
import { AppUserSetting } from "../../../types/user"
import { VerticalAlignedItems } from "../../layout/verticalAlignedItems"

export interface PageAccountProps extends React.HTMLAttributes<HTMLDivElement> {
  data: AppUserSetting
}

export const PageAccount = ({ data }: PageAccountProps) => {
  const router = useRouter()
  const notify = useNotification()
  const { mutateAsync: signout, isPending } = useAuthSignout()
  const { show: showUserEditModal, modal: UserEditModal } = useUserEditModal()

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
    </PageLayout>
  )
}
