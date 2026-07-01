import dayjs from "dayjs"
import { ArrowLeft, Download } from "lucide-react"
import { useState } from "react"

import { LoadingIndicator } from "../../../components/indicator"
import { BodyLayout } from "../../../components/layout/body"
import { PageLayout } from "../../../components/layout/page"
import { Markdown } from "../../../components/markdown"
import { useFileGetContent } from "../../../hooks/trpc/file"
import { L } from "../../../localization"
import { Route } from "../../../route"
import { AppFileDescriptor } from "../../../types/file"
import { RectangleButton } from "../../buttons/rectangleButton"
import { FileHistoryPanel } from "./history"

export interface PageFileProps extends React.HTMLAttributes<HTMLDivElement> {
  data: AppFileDescriptor
}

export const PageFile = ({ data }: PageFileProps) => {
  const { name, birthtime } = data
  const [historyId, setHistoryId] = useState<string | undefined>(undefined)
  const { data: content, isPending } = useFileGetContent({ id: data.id, historyId })

  const renderContent = () => {
    if (isPending || !content) {
      return <LoadingIndicator className="mt-8" size={"medium"} />
    }
    const uint8Array = new Uint8Array(content)
    switch (data.mimeType) {
      case "text/markdown":
      case "text/plain": {
        const text = new TextDecoder().decode(uint8Array)
        return <Markdown markdown={text} />
      }
      case "text/plain": {
        const text = new TextDecoder().decode(uint8Array)
        return <div className="whitespace-pre-wrap">{text}</div>
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
  return (
    <PageLayout>
      <BodyLayout
        className="max-w-6xl"
        title={name}
        tail={
          <RectangleButton
            icon={<Download size={18} />}
            onClick={() => open(Route.fileContentDownload(data.id), "_blank", "noopener,noreferrer")}
          >
            <span className="hidden sm:inline">{L.file.download}</span>
          </RectangleButton>
        }
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
        <div className="flex h-full w-full flex-1 gap-8">
          <div className="flex min-h-full flex-1 flex-col wrap-break-word">{renderContent()}</div>
          <FileHistoryPanel
            descId={data.id}
            currentHash={data.blobHash}
            onClickHistory={setHistoryId}
            selectedHistoryId={historyId}
            className="align-self-start sticky top-8"
          />
        </div>
      </BodyLayout>
    </PageLayout>
  )
}
