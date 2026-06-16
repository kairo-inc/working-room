import { DomainMessage, ImplementationError } from "@wr/shared"

import {
  AppAssistantMessage,
  AppMessage,
  AppMessageContentFileRef,
  AppMessageContentProceededFile,
  AppMessageContentText,
  AppUserMessage,
} from "../types/message"

export const mapUserMessageDomainToApp = (message: Extract<DomainMessage, { role: "user" }>): AppUserMessage => {
  if (message.role !== "user") {
    throw new ImplementationError(`DomainMessage role is not "user": ${message.role}`)
  }
  // NOTE: This method drops some types of content (e.g. images) that are not supported in the app yet.
  // We may want to support them in the future, but for now we just ignore them.
  return {
    id: message.id,
    role: "user",
    content: message.content
      .map((c) => {
        switch (c.type) {
          case "text":
            return { type: "text", text: c.text } satisfies AppMessageContentText
          case "file-ref":
            return {
              type: "file-ref",
              descId: c.descId,
              blobHash: c.blobHash,
              mimeType: c.mimeType,
            } satisfies AppMessageContentFileRef
          case "meta":
            return null
          default:
            throw new ImplementationError(`Unsupported message content type: ${(c as any).type}`)
        }
      })
      .filter((c): c is AppUserMessage["content"][number] => c !== null),
  }
}

export const mapAssistantMessageDomainToApp = (message: Extract<DomainMessage, { role: "assistant" }>): AppAssistantMessage => {
  if (message.role !== "assistant") {
    throw new ImplementationError(`DomainMessage role is not "assistant": ${message.role}`)
  }
  return {
    id: message.id,
    role: "assistant",
    content: message.content
      .map((c) => {
        switch (c.type) {
          case "text":
            return { type: "text", text: c.text } satisfies AppMessageContentText
          case "tool-call":
            return null
          case "proceeded-file":
            return {
              type: "proceeded-file",
              descId: c.descId,
              blobHash: c.blobHash,
              mimeType: c.mimeType,
            } satisfies AppMessageContentProceededFile
          default:
            throw new ImplementationError(`Unsupported message content type: ${(c as any).type}`)
        }
      })
      .filter((c): c is AppAssistantMessage["content"][number] => c !== null),
  }
}

export const mapMessageDomainToApp = (message: DomainMessage): AppMessage => {
  switch (message.role) {
    case "user":
      return mapUserMessageDomainToApp(message)
    case "assistant":
      return mapAssistantMessageDomainToApp(message)
    default:
      throw new ImplementationError(`Unsupported message role: ${message.role}`)
  }
}
