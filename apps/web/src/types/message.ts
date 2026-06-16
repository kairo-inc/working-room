import { MimeType } from "@wr/shared"

export type AppMessageContentText = { type: "text"; text: string }
export type AppMessageContentFileRef = { type: "file-ref"; descId: string; blobHash: string; mimeType: MimeType }
export type AppMessageContentProceededFile = { type: "proceeded-file"; descId: string; blobHash: string; mimeType: MimeType }

export type AppMessageContent = AppMessageContentText | AppMessageContentFileRef | AppMessageContentProceededFile

export type AppUserMessage = {
  id: string
  role: "user"
  content: Array<AppMessageContentText | AppMessageContentFileRef>
}

export type AppAssistantMessage = {
  id: string
  role: "assistant"
  content: Array<AppMessageContentText | AppMessageContentProceededFile>
}

export type AppMessage = AppUserMessage | AppAssistantMessage
