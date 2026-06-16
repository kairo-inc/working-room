import { FormApi } from "final-form"
import { Form } from "react-final-form"

import { ChatForm } from "../../../components/chatForm"
import { FileUploadPane } from "../../../components/file/upload"
import { useFileUploadFileToChat } from "../../../hooks/trpc/file"

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
  chatId: string
  onSubmit: ChatInputFormSubmitFn
}

export const ChatInputForm = ({ onSubmit, chatId }: ChatInputFormProps) => {
  const { mutateAsync: uploadFile } = useFileUploadFileToChat()
  return (
    <Form<ChatInputFormType>
      onSubmit={onSubmit}
      render={({ handleSubmit, submitting, form: { change, getFieldState } }) => (
        <form onSubmit={handleSubmit} className="bg-background sticky bottom-0 mx-auto w-full pb-8">
          <ChatForm formName="chatMessage" fileFormName="fileUpload" isPending={submitting} />
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
  )
}
