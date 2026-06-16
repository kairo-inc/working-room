import { PlusIcon } from "lucide-react"

import { PageResult } from "@wr/shared"

import { RectangleButton } from "../../../../components/buttons/rectangleButton"
import { BodyLayout } from "../../../../components/layout/body"
import { PageLayout } from "../../../../components/layout/page"
import { useUserInviteModal } from "../../../../components/modals/userInvite"
import { L } from "../../../../localization"
import { AppUser } from "../../../../types/user"
import { Pager } from "../../../pager"
import { UserList } from "./list"

export interface PageSettingUserListProps extends React.HTMLAttributes<HTMLDivElement> {
  data: PageResult<AppUser>
}

export const PageSettingUserList = ({ data }: PageSettingUserListProps) => {
  const { show, modal } = useUserInviteModal()
  const addUserButton = (
    <RectangleButton icon={<PlusIcon />} onClick={() => show({})}>
      {L.settingUser.addUser}
    </RectangleButton>
  )
  return (
    <PageLayout>
      <BodyLayout title={L.settingUser.title} description={L.settingUser.description} tail={addUserButton}>
        <UserList data={data.data} />
        <Pager {...data} className="mt-4" />
      </BodyLayout>
      {modal}
    </PageLayout>
  )
}
