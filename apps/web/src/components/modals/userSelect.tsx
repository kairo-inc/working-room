import { useState } from "react"
import { Form } from "react-final-form"

import { useUserGetList } from "../../hooks/trpc/user"
import { L } from "../../localization"
import { AppUser } from "../../types/user"
import { RectangleButton } from "../buttons/rectangleButton"
import { TextForm } from "../forms/textForm"
import { LoadingIndicator } from "../indicator"
import { Modal, ModalProps, useModal } from "./modal"

type FormData = {
  search: string
}

type Args = {
  onUserSelected?: (user: AppUser) => void
}

const UserList = (args: {
  userList: AppUser[]
  isLoading?: boolean
  selectedUserId?: string
  onUserSelected?: (user: AppUser) => void
}) => {
  const { isLoading, userList, onUserSelected } = args

  const rowClassName = "text-sm cursor-pointer p-2 hover:bg-muted border-t border-border first:border-t-0"
  const selectedRowClassName = "!bg-primary/20 !text-primary"
  const placeholderClassName = "text-sm text-muted-foreground p-2 border-t border-border first:border-t-0 text-center"
  const headerCellClassName = "py-2 px-2 text-left text-sm font-normal text-muted-foreground p-2"
  const cellClassName = "py-2 px-2 border-t border-border text-sm text-left p-2"
  const hasUsers = userList.length > 0

  return (
    <>
      <table className="w-full">
        <thead>
          <tr>
            <th className={headerCellClassName}>{L.modal.userSelect.name}</th>
            <th className={headerCellClassName}>{L.modal.userSelect.email}</th>
            <th className={headerCellClassName}>{L.modal.userSelect.role}</th>
          </tr>
        </thead>
        <tbody>
          {hasUsers ? (
            userList.map((user) => (
              <tr
                key={user.id}
                className={user.id === args.selectedUserId ? selectedRowClassName : rowClassName}
                onClick={() => onUserSelected?.(user)}
              >
                <td className={cellClassName}>{user.name}</td>
                <td className={cellClassName}>{user.email}</td>
                <td className={cellClassName}>{user.role}</td>
              </tr>
            ))
          ) : (
            <tr className={placeholderClassName}>
              <td colSpan={3}>{L.modal.userSelect.noUsers}</td>
            </tr>
          )}
        </tbody>
      </table>
      {isLoading && (
        <div className="flex items-center justify-center p-4">
          <LoadingIndicator />
        </div>
      )}
    </>
  )
}

type UserSelectModalProps = ModalProps & Args

export const UserSelectModal = ({ show, onClose, onUserSelected }: UserSelectModalProps) => {
  const [selectedUser, setSelectedUser] = useState<AppUser | null>(null)
  const [queryArgs, setQueryArgs] = useState<Parameters<typeof useUserGetList>[0]>({ take: 5 })

  const { data, isPending } = useUserGetList(queryArgs)
  const userList = data?.pages.flatMap((page) => page.data) ?? []

  return (
    <Modal show={show} onClose={onClose} title={L.modal.userSelect.title} containerClassName="w-[clamp(30vw,600px,80vw)] h-1/2">
      <div className="flex-1 text-sm">
        <Form<FormData>
          onSubmit={() => {}}
          render={() => (
            <form>
              <TextForm
                formName="search"
                label={""}
                placeholder={L.modal.userSelect.searchPlaceholder}
                onChange={(e) => {
                  const value = e.target.value
                  setQueryArgs((prev) => ({ ...prev, charContains: value }))
                }}
              />
            </form>
          )}
        />
        <UserList userList={userList} onUserSelected={setSelectedUser} selectedUserId={selectedUser?.id} isLoading={isPending} />
      </div>
      <div className="flex justify-end gap-4">
        <RectangleButton
          disabled={!selectedUser}
          onClick={() => {
            onUserSelected?.(selectedUser!)
            onClose?.()
          }}
        >
          {L.modal.fileSelect.select}
        </RectangleButton>
        <RectangleButton variant="defaultOutline" onClick={onClose}>
          {L.modal.fileSelect.close}
        </RectangleButton>
      </div>
    </Modal>
  )
}

export const useUserSelectModal = () => {
  return useModal<Args>(UserSelectModal)
}
