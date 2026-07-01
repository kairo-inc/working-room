import dayjs from "dayjs"
import { ArrowLeft, Download, Pencil, X } from "lucide-react"
import { useRef, useState } from "react"

import { TextEditor } from "../../../components/editor"
import { LoadingIndicator } from "../../../components/indicator"
import { BodyLayout } from "../../../components/layout/body"
import { PageLayout } from "../../../components/layout/page"
import { Markdown } from "../../../components/markdown"
import { useFileGetContent, useFileUpdateTextContent } from "../../../hooks/trpc/file"
import { L } from "../../../localization"
import { Route } from "../../../route"
import { AppFileDescriptor } from "../../../types/file"
import { RectangleButton } from "../../buttons/rectangleButton"
import { FileHistoryPanel } from "./history"

export interface PageFileProps extends React.HTMLAttributes<HTMLDivElement> {
  data: AppFileDescriptor
}

const EDITABLE_MIME_TYPES = ["text/markdown", "text/plain"] as const

export const PageFile = ({ data }: PageFileProps) => {
  const { name, birthtime } = data
  const [historyId, setHistoryId] = useState<string | undefined>(undefined)
  const [isEditing, setIsEditing] = useState(false)
  const { data: content, isPending, refetch } = useFileGetContent({ id: data.id, historyId })
  const { mutateAsync: updateContent, isPending: isSaving } = useFileUpdateTextContent()

  const currentText = content ? new TextDecoder().decode(new Uint8Array(content)) : ""
  const originalContentRef = useRef<string>("")
  const editorContentRef = useRef<string>("")

  const isEditable = EDITABLE_MIME_TYPES.includes(data.mimeType as (typeof EDITABLE_MIME_TYPES)[number])

  const handleStartEdit = () => {
    originalContentRef.current = currentText
    editorContentRef.current = currentText
    setIsEditing(true)
  }

  const handleCancelEdit = () => {
    setIsEditing(false)
  }

  const handleSave = async () => {
    await updateContent({
      id: data.id,
      oldContent: originalContentRef.current,
      newContent: editorContentRef.current,
    })
    originalContentRef.current = editorContentRef.current
    setIsEditing(false)
    await refetch()
  }

  const renderContent = () => {
    if (isPending || !content) {
      return <LoadingIndicator className="mt-8" size={"medium"} />
    }
    const uint8Array = new Uint8Array(content)
    switch (data.mimeType) {
      case "text/markdown":
      case "text/plain": {
        const text = new TextDecoder().decode(uint8Array)
        if (isEditing) {
          return (
            <TextEditor
              initialContent={text}
              mimeType={data.mimeType}
              onChange={(content) => {
                editorContentRef.current = content
              }}
            />
          )
        }
        return data.mimeType === "text/markdown" ? (
          <Markdown markdown={text} />
        ) : (
          <div className="whitespace-pre-wrap">{text || <span className="text-muted-foreground select-none">{L.file.emptyFile}</span>}</div>
        )
      }
      case "text/csv": {
        // NOTE: Currently expect commas as separators.
        const text = new TextDecoder().decode(uint8Array)
        const quotesRegex = /"(.*?)"/g
        return (
          <table>
            <tbody>
              {text.split("\n").map((line, index) => (
                <tr key={index}>
                  {line.split(",").map((cell, cellIndex) => (
                    <td key={cellIndex} className="border px-2 py-1">
                      {cell.replace(quotesRegex, "$1") /* Remove quotes if present */}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        )
      }
      case "image/png":
      case "image/jpeg":
      case "image/gif":
      case "image/webp": {
        const urlObject = URL.createObjectURL(new Blob([uint8Array], { type: data.mimeType }))
        return <img src={urlObject} alt={name} />
      }
      case "application/pdf": {
        const urlObject = URL.createObjectURL(new Blob([uint8Array], { type: data.mimeType }))
        return (
          <object data={urlObject} type="application/pdf" className="flex-1">
            <p>
              {L.file.noPdfPlugin}
              <a href={urlObject} target="_blank" rel="noopener noreferrer">
                {L.file.downloadPdf}
              </a>
            </p>
          </object>
        )
      }
      default:
        return (
          <div>
            {L.file.unsupportedFileType} {data.mimeType}
          </div>
        )
    }
  }

  const createdAt = dayjs(birthtime).fromNow()

  const tailButtons = isEditing ? (
    <div className="flex gap-2">
      <RectangleButton variant="defaultOutline" icon={<X size={18} />} onClick={handleCancelEdit} disabled={isSaving}>
        <span className="hidden sm:inline">{L.file.cancelEdit}</span>
      </RectangleButton>
      <RectangleButton onClick={handleSave} loading={isSaving}>
        {L.file.save}
      </RectangleButton>
    </div>
  ) : (
    <div className="flex gap-2">
      {isEditable && (
        <RectangleButton variant="defaultOutline" icon={<Pencil size={18} />} onClick={handleStartEdit}>
          <span className="hidden sm:inline">{L.file.edit}</span>
        </RectangleButton>
      )}
      <RectangleButton
        icon={<Download size={18} />}
        onClick={() => open(Route.fileContentDownload(data.id), "_blank", "noopener,noreferrer")}
      >
        <span className="hidden sm:inline">{L.file.download}</span>
      </RectangleButton>
    </div>
  )

  return (
    <PageLayout>
      <BodyLayout
        className="max-w-6xl"
        title={name}
        tail={tailButtons}
        description={
          <div className="flex items-center justify-between border-b pt-2 pb-2">
            {data.parentId && (
              <a href={Route.tree(data.parentId)} className="text-primary inline-flex items-center gap-1 hover:underline">
                <ArrowLeft className="size-4" />
                {L.file.backToDirectory}
              </a>
            )}
            <span className="text-muted-foreground ml-4 text-sm">{L.file.createdAt.replace("{0}", createdAt)}</span>
          </div>
        }
      >
        <div className={`flex w-full gap-8 ${isEditing ? "flex-col" : "flex-1"}`}>
          <div className={`bg-card flex flex-col wrap-break-word ${isEditing ? "w-full" : "flex-1 rounded-md p-4"}`}>{renderContent()}</div>
          {!isEditing && (
            <FileHistoryPanel
              descId={data.id}
              currentHash={data.blobHash}
              onClickHistory={setHistoryId}
              selectedHistoryId={historyId}
              className="align-self-start sticky top-8"
            />
          )}
        </div>
      </BodyLayout>
    </PageLayout>
  )
}
