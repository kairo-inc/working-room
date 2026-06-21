import dayjs from "dayjs"
import { ComponentPropsWithoutRef, useEffect } from "react"

import { UserRole } from "@wr/db"

import { useHoverMenu } from "../../../../components/hoverMenu"
import { HoverMenuItemData } from "../../../../components/hoverMenu/item"
import { useUserChangeRoleModal } from "../../../../components/modals/userChangeRole"
import { useUserDeleteModal } from "../../../../components/modals/userDelete"
import { useUserResetPasswordModal } from "../../../../components/modals/userResetPassword"
import { L } from "../../../../localization"
import { AppUser } from "../../../../types/user"
import { Table } from "../../../table"

type HoverMenuAction = "delete" | "resetPassword" | "changeRole"

type UserListProps = ComponentPropsWithoutRef<"table"> & {
  data: AppUser[]
}

export const UserList = ({ data, className, ...props }: UserListProps) => {
  const { modal: UserDeleteModal, show: showUserDeleteModal } = useUserDeleteModal()
  const { modal: UserResetPasswordModal, show: showUserResetPasswordModal } = useUserResetPasswordModal()
  const { modal: UserChangeRoleModal, show: showUserChangeRoleModal } = useUserChangeRoleModal()
  const { show: showHoverMenu, menu: HoverMenu } = useHoverMenu<HoverMenuAction>()

  const hoverMenuItems: HoverMenuItemData<HoverMenuAction>[] = [
    { action: "resetPassword", label: L.settingUser.actions.resetPassword, variant: "default" },
    { action: "changeRole", label: L.settingUser.actions.changeRole, variant: "default" },
    { action: "delete", label: L.settingUser.actions.delete, variant: "destructive" },
  ]

  useEffect(() => {
    const contextMenuHandler = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      const row = target.closest("tr")
      if (row) {
        e.preventDefault()
        const userId = row.getAttribute("data-user-id")
        const userName = row.getAttribute("data-user-name")
        const userEmail = row.getAttribute("data-user-email")
        const userRole = row.getAttribute("data-user-role") as UserRole | undefined
        if (!userId || !userName || !userEmail || !userRole) return
        showHoverMenu(e, {
          items: hoverMenuItems,
          onItemClick: (action) => {
            if (action === "delete") {
              showUserDeleteModal({ data: { id: userId, email: userEmail, name: userName } })
            } else if (action === "resetPassword") {
              showUserResetPasswordModal({ data: { id: userId, email: userEmail, name: userName } })
            } else if (action === "changeRole") {
              showUserChangeRoleModal({ data: { id: userId, email: userEmail, name: userName, role: userRole } })
            }
          },
        })
      }
    }
    document.addEventListener("contextmenu", contextMenuHandler)
    return () => {
      document.removeEventListener("contextmenu", contextMenuHandler)
    }
  }, [])

  return (
    <>
      <Table
        headers={[
          { label: L.settingUser.headers.name },
          { label: L.settingUser.headers.email },
          { label: L.settingUser.headers.role },
          { label: L.settingUser.headers.createdAt },
        ]}
        rows={data.map((user) => ({
          dataAttrs: {
            "data-user-id": user.id,
            "data-user-name": user.name,
            "data-user-email": user.email,
            "data-user-role": user.role,
          },
          items: [user.name, user.email, user.role, dayjs(user.createdAt).format("YYYY-MM-DD HH:mm")],
        }))}
        className={className}
        {...props}
      />
      {HoverMenu}
      {UserDeleteModal}
      {UserResetPasswordModal}
      {UserChangeRoleModal}
    </>
  )
}
