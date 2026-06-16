import clsx from "clsx"
import { X } from "lucide-react"
import { type ComponentPropsWithoutRef, useEffect, useState } from "react"

import { FileIconMd } from "../file/item"
import { LoadingIndicator } from "../indicator"

type FileItemProps = ComponentPropsWithoutRef<"div"> & {
  file: File
  isUploading?: boolean
  onRemove: (file: File) => void
}

export const FileItem = ({ file, onRemove, className, isUploading }: FileItemProps) => {
  const [objectUrl, setObjectUrl] = useState<string | null>(null)

  useEffect(() => {
    if (file.type.startsWith("image") || file.type.includes("pdf")) {
      const nextObjectUrl = URL.createObjectURL(file)
      setObjectUrl(nextObjectUrl)
      return () => URL.revokeObjectURL(nextObjectUrl)
    }

    setObjectUrl(null)
    return undefined
  }, [file])

  const renderContent = () => {
    if (file.type.startsWith("image") && objectUrl) {
      return <img src={objectUrl} alt={file.name} className="h-full w-full object-cover" />
    } else if (file.type.includes("pdf") && objectUrl) {
      return (
        <div className="bg-muted flex h-full w-full items-center justify-center text-sm">
          <embed src={objectUrl} type="application/pdf" className="h-full w-full" />
        </div>
      )
    } else {
      const ext = file.name.split(".").pop()
      return (
        <div className="bg-muted flex h-full w-full min-w-0 items-center text-xs whitespace-pre">
          <FileIconMd className="mx-auto mr-1" type={file.type} />
          {file.name}...{ext}
        </div>
      )
    }
  }

  return (
    <div className={clsx("bg-card group relative h-16 w-24 overflow-hidden rounded-md border select-none", className)}>
      <button
        type="button"
        className="hover:bg-muted-foreground absolute top-1 right-1 rounded-full p-0.5 opacity-0 transition-opacity group-hover:opacity-100"
        onClick={() => onRemove(file)}
        aria-label={`Remove ${file.name}`}
      >
        <X size={16} className="cursor-pointer" />
      </button>
      {renderContent()}
      {isUploading && (
        <div className="bg-muted/50 absolute inset-0 flex animate-pulse items-center justify-center rounded-md">
          <LoadingIndicator size="medium" />
        </div>
      )}
    </div>
  )
}
