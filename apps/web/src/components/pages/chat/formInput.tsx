import { FormApi } from "final-form"
import { useRouter } from "next/router"
import { Form } from "react-final-form"

import { ChatForm } from "../../../components/chatForm"
import { FileUploadPane } from "../../../components/file/upload"
import { useNotification } from "../../../contexts/notification"
import { useSetting } from "../../../contexts/setting"
import { useChatEdit } from "../../../hooks/trpc/chat"
import { useFileGetParentOrRoot, useFileUploadFileToChat } from "../../../hooks/trpc/file"
import { L } from "../../../localization"
import { Route } from "../../../route"
import { AppChatStatus } from "../../../types/chat"
import { FileIconSm } from "../../file/item"
import { Link } from "../../link"
import { useFileSelectModal } from "../../modals/fileSelect"

export type FileUploadItemMeta = {
  descId: string
  blobHash: string
  mimeType: string
}

type FileUploadItem = {
  file: File
  isUploading: boolean
  meta?: FileUploadItemMeta
}

type ChatInputFormType = {
  chatMessage: string
  fileUpload: FileUploadItem[]
}

export type ChatInputFormSubmitFn = (
  values: ChatInputFormType,
  form: FormApi<ChatInputFormType, Partial<ChatInputFormType>>
) => Promise<void>

export type ChatInputFormProps = {
  chat: AppChatStatus
  onSubmit: ChatInputFormSubmitFn
}

export const ChatInputForm = ({ onSubmit, chat }: ChatInputFormProps) => {
  const chatId = chat.id
  const router = useRouter()
  const notify = useNotification()
  const { privateDirId } = useSetting()
  const { mutateAsync: uploadFile } = useFileUploadFileToChat()
  const { mutateAsync: editChat } = useChatEdit()
  const { show: showFileSelectModal, modal: FileSelectModal } = useFileSelectModal()

  // This will be the default working folder when the user opens the file select modal.
  const workingFolder = chat.workingFolder ?? { id: privateDirId, name: L.chat.privateFolder }
  const { data: parentWorkingFolder } = useFileGetParentOrRoot(workingFolder.id)

  return (
    <>
      <Form<ChatInputFormType>
        onSubmit={onSubmit}
        render={({ handleSubmit, submitting, form: { change, getFieldState } }) => (
          <form onSubmit={handleSubmit} className="bg-background sticky bottom-0 mx-auto w-full pb-8">
            <ChatForm formName="chatMessage" fileFormName="fileUpload" isPending={submitting} />
            <div className="text-muted-foreground mt-0.5 inline-flex w-full items-center justify-end gap-1 text-xs">
              {L.chat.currentDirectory}:{" "}
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
            <FileUploadPane
              onFileUpload={async (file) => {
                const currentFiles = getFieldState("fileUpload")?.value || []
                const uniqueFiles = file.filter((f) => !currentFiles.some((cf) => cf.file.name === f.name && cf.file.size === f.size))
                if (uniqueFiles.length === 0) {
                  return
                }

                // Add pending files to the form state
                change("fileUpload", [...currentFiles, ...uniqueFiles.map((f) => ({ file: f, isUploading: true }))])

                // Upload files and update form state with results
                const descs = await Promise.all(
                  uniqueFiles.map(async (f) => {
                    const formData = new FormData()
                    formData.append("file", f)
                    formData.append("chatId", chatId)
                    try {
                      const { id, blobHash, mimeType } = await uploadFile(formData)
                      return {
                        file: f,
                        isUploading: false,
                        meta: {
                          descId: id,
                          blobHash,
                          mimeType,
                        },
                      }
                    } catch (e) {
                      return { file: f, isUploading: false }
                    }
                  })
                )
                change("fileUpload", [...currentFiles, ...descs])
              }}
            />
          </form>
        )}
      />
      {FileSelectModal}
    </>
  )
}
