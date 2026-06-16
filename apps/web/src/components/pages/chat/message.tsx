import clsx from "clsx"
import { ComponentPropsWithoutRef } from "react"

import { ImageThumbnail } from "../../../components/asset/image"
import { PdfThumbnail } from "../../../components/asset/pdf"
import { FileListItem } from "../../../components/file/item"
import { LoadingIndicator } from "../../../components/indicator"
import { Markdown } from "../../../components/markdown"
import { L } from "../../../localization"
import { AppMessage, AppMessageContentFileRef, AppMessageContentProceededFile } from "../../../types/message"

const MAX_PROCEEDED_FILES_DISPLAY = 5

type ChatMessageProps = ComponentPropsWithoutRef<"div"> & {
  role: AppMessage["role"]
  text: string
  fileMeta?: AppMessageContentFileRef[]
  proceededFiles?: AppMessageContentProceededFile[]
  showLoading?: boolean
  progressText?: string
}

export const ChatMessage = ({ role, text, fileMeta, proceededFiles, showLoading, progressText, ...rest }: ChatMessageProps) => {
  return (
    <div className={clsx("my-2 flex flex-col gap-2 rounded-sm p-4 pb-2", role === "user" ? "" : "bg-card")}>
      <span className="inline-block text-sm">
        <span className="text-primary mr-2 font-bold">{role}</span>
        <span className="text-primary">{">>"}</span>
      </span>
      <div className="text-md pl-8">
        {showLoading ? (
          <div className="text-primary flex h-10 items-center gap-4 pb-4">
            <LoadingIndicator />
            {progressText && <span>{progressText}</span>}
          </div>
        ) : (
          <Markdown markdown={text} />
        )}
        {fileMeta && fileMeta.length > 0 && (
          <div className="flex gap-2 pb-2">
            {fileMeta.map((meta) => {
              const { mimeType } = meta
              if (mimeType.startsWith("image")) {
                return <ImageThumbnail key={meta.descId} descId={meta.descId} />
              } else if (mimeType.includes("pdf")) {
                return <PdfThumbnail key={meta.descId} descId={meta.descId} />
              } else if (mimeType.startsWith("text")) {
                return <FileListItem key={meta.descId} descId={meta.descId} />
              }
            })}
          </div>
        )}
        {proceededFiles && proceededFiles.length > 0 && (
          <div className="flex flex-wrap gap-2 pb-2">
            {proceededFiles.slice(0, MAX_PROCEEDED_FILES_DISPLAY).map((file) => (
              <FileListItem key={file.descId} descId={file.descId} />
            ))}
            {proceededFiles.length > MAX_PROCEEDED_FILES_DISPLAY && (
              <div className="text-muted-foreground py-1 text-xs">
                {(() => {
                  const n = proceededFiles.length - MAX_PROCEEDED_FILES_DISPLAY
                  return (n > 1 ? L.chat.moreFilePlural : L.chat.moreFileSingular).replace("{0}", String(n))
                })()}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
