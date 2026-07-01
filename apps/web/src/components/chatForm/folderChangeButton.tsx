import clsx from "clsx"
import { useRouter } from "next/router"
import { ComponentPropsWithoutRef } from "react"

import { useNotification } from "../../contexts/notification"
import { useSetting } from "../../contexts/setting"
import { useChatEdit } from "../../hooks/trpc/chat"
import { useFileGetParentOrRoot } from "../../hooks/trpc/file"
import { L } from "../../localization"
import { Route } from "../../route"
import { AppChatStatus } from "../../types/chat"
import { FileIconSm } from "../file/item"
import { Link } from "../link"
import { useFileSelectModal } from "../modals/fileSelect"

type ChatInputFormProps = ComponentPropsWithoutRef<"div"> & {
  chat: AppChatStatus
}

export const FolderChangeButton = ({ chat, className, ...props }: ChatInputFormProps) => {
  const chatId = chat.id
  const router = useRouter()
  const notify = useNotification()
  const { privateDirId } = useSetting()
  const { mutateAsync: editChat } = useChatEdit()
  const { show: showFileSelectModal, modal: FileSelectModal } = useFileSelectModal()

  // This will be the default working folder when the user opens the file select modal.
  const workingFolder = chat.workingFolder ?? { id: privateDirId, name: L.chat.privateFolder }
  const { data: parentWorkingFolder } = useFileGetParentOrRoot(workingFolder.id)

  return (
    <>
      <div className={clsx("text-muted-foreground mt-0.5 flex w-full items-center justify-end gap-1 text-xs", className)} {...props}>
        <span className="hidden sm:inline">{L.chat.currentDirectory}: </span>
        <Link href={Route.tree(workingFolder.id)} target="_blank" className="text-primary">
          <FileIconSm type="inode/directory" />
          {workingFolder.name}
        </Link>{" "}
        /{" "}
        <button
          className="text-primary hover:text-link-hover border-none text-xs font-normal outline-none hover:cursor-pointer hover:underline"
          type="button"
          onClick={() =>
            showFileSelectModal({
              initialParentFolderId: parentWorkingFolder?.parentId,
              onFileSelected: async (file) => {
                try {
                  await editChat({ id: chatId, workingFolderId: file.id })
                  router.replace(router.asPath)
                } catch (e) {
                  notify.error(L.common.error, e.message)
                }
              },
            })
          }
        >
          {L.chat.changeDirectory}
        </button>
      </div>
      {FileSelectModal}
    </>
  )
}
