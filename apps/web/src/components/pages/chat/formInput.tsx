import { FormApi } from "final-form"
import { Form } from "react-final-form"

import { AppChatStatus } from "../../../types/chat"
import { ChatTextArea } from "../../chatForm/chatTextArea"
import { FolderChangeButton } from "../../chatForm/folderChangeButton"

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

type ChatInputFormProps = {
  chat: AppChatStatus
  onSubmit: ChatInputFormSubmitFn
  isDisabled?: boolean
}

const validate = (values: ChatInputFormType) => {
  const errors: Partial<ChatInputFormType> = {}
  if (!values.chatMessage) {
    errors.chatMessage = "Please enter a message or upload a file."
  }
  return errors
}

export const ChatInputForm = ({ onSubmit, isDisabled, chat }: ChatInputFormProps) => {
  const chatId = chat.id
  return (
    <>
      <Form<ChatInputFormType>
        onSubmit={onSubmit}
        validate={validate}
        render={({ handleSubmit, submitting, hasValidationErrors }) => (
          <form onSubmit={handleSubmit} className="bg-background sticky bottom-0 mx-auto w-full pb-4">
            <ChatTextArea chatId={chatId} isDisabled={submitting || isDisabled || hasValidationErrors} />
            <FolderChangeButton chat={chat} className="mt-2" />
          </form>
        )}
      />
    </>
  )
}
