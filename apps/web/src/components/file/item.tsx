import clsx from "clsx"
import { File, FileImage, FileMinus, FileSpreadsheet, FileText, Folder, Presentation } from "lucide-react"

import { useFileGet } from "../../hooks/trpc/file"
import { L } from "../../localization"
import { Route } from "../../route"
import { LoadingIndicator } from "../indicator"

export interface FileIconProps extends React.HTMLAttributes<HTMLDivElement> {
  type: string
  className?: string
}

export interface FileItemProps extends React.HTMLAttributes<HTMLDivElement> {
  descId: string
}

const getIcon = (type: string, size: "sm" | "md" | "lg" | "xl") => {
  const getSize = size === "sm" ? "size-4" : size === "md" ? "size-6" : size === "lg" ? "size-8" : "size-16"
  switch (type) {
    case "inode/directory":
      return <Folder className={getSize} fill="currentColor" />
    case "application/pdf":
      return <FileMinus className={getSize} />
    case "text/markdown":
    case "text/plain":
    case "text/csv":
      return <FileText className={getSize} />
    case "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
      return <FileText className={clsx(getSize, "text-word")} />
    case "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet":
      return <FileSpreadsheet className={clsx(getSize, "text-excel")} />
    case "application/vnd.openxmlformats-officedocument.presentationml.presentation":
      return <Presentation className={clsx(getSize, "text-powerpoint")} />
    case "image/png":
    case "image/jpeg":
    case "image/gif":
    case "image/webp":
      return <FileImage className={getSize} />
    default:
      return <File className={getSize} />
  }
}

export const FileIconSm = ({ type, className }: FileIconProps) => {
  return <div className={clsx(className)}>{getIcon(type, "sm")}</div>
}

export const FileIconMd = ({ type, className }: FileIconProps) => {
  return <div className={clsx(className)}>{getIcon(type, "md")}</div>
}

export const FileIconLg = ({ type, className }: FileIconProps) => {
  return <div className={clsx(className)}>{getIcon(type, "lg")}</div>
}

export const FileIconXl = ({ type, className }: FileIconProps) => {
  return <div className={clsx(className)}>{getIcon(type, "xl")}</div>
}

export const FileListItem = ({ descId }: FileItemProps) => {
  const { data: file, isPending, isError } = useFileGet({ id: descId })

  const getContent = () => {
    if (isPending) return <LoadingIndicator size="small" />
    if (isError) return <div className="text-xs">{L.file.notFound}</div>
    if (file.isFolder) {
      return (
        <a href={Route.tree(file.id)} className="inline-flex items-center gap-1 text-xs" target="_blank" rel="noopener noreferrer">
          <FileIconSm type={file.mimeType} />
          <div>{file.name}</div>
        </a>
      )
    } else {
      return (
        <a href={Route.file(file.id)} className="inline-flex items-center gap-1 text-xs" target="_blank" rel="noopener noreferrer">
          <FileIconSm type={file.mimeType} />
          <div>{file.name}</div>
        </a>
      )
    }
  }

  return (
    <div className="bg-muted hover:bg-muted/50 inline-flex items-center rounded-md border px-2 py-1 transition-colors">{getContent()}</div>
  )
}
