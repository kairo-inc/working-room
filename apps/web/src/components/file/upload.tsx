import { ComponentPropsWithoutRef, useEffect, useRef, useState } from "react"

import { L } from "../../localization"
import { LoadingIndicator } from "../indicator"

type FileUploadPaneProps = ComponentPropsWithoutRef<"div"> & {
  onFileUpload: (files: File[]) => Promise<void>
}

export const FileUploadPane = ({ onFileUpload }: FileUploadPaneProps) => {
  const [isDragging, setIsDragging] = useState(false)
  const [isPending, setIsPending] = useState(false)
  const dragCounter = useRef(0)
  useEffect(() => {
    const isFileDrag = (e: DragEvent) => {
      return Array.from(e.dataTransfer?.types || []).includes("Files")
    }

    const handleDragEnter = (e: DragEvent) => {
      if (!isFileDrag(e)) return

      e.preventDefault()

      dragCounter.current += 1
      setIsDragging(true)
    }

    const handleDrop = async (e: DragEvent) => {
      e.preventDefault()
      dragCounter.current = 0
      setIsDragging(false)
      try {
        if (e.dataTransfer?.files) {
          setIsPending(true)
          const files = Array.from(e.dataTransfer.files)
          await onFileUpload(files)
          setIsPending(false)
        }
      } catch (e) {
        setIsDragging(false)
      } finally {
        setIsPending(false)
      }
    }

    const handleDragOver = (e: DragEvent) => {
      if (!isFileDrag(e)) return

      e.preventDefault()
    }

    const handleDragLeave = (e: DragEvent) => {
      if (!isFileDrag(e)) return

      e.preventDefault()

      dragCounter.current -= 1

      if (dragCounter.current <= 0) {
        dragCounter.current = 0
        setIsDragging(false)
      }
    }

    window.addEventListener("dragenter", handleDragEnter)
    window.addEventListener("drop", handleDrop)
    window.addEventListener("dragover", handleDragOver)
    window.addEventListener("dragleave", handleDragLeave)

    return () => {
      window.removeEventListener("dragenter", handleDragEnter)
      window.removeEventListener("drop", handleDrop)
      window.removeEventListener("dragover", handleDragOver)
      window.removeEventListener("dragleave", handleDragLeave)
    }
  }, [])

  if (!isDragging && !isPending) return null
  return (
    <div className="bg-popover/40 pointer-events-none fixed inset-0 z-50 flex h-full w-full cursor-auto items-center justify-center">
      <div className="bg-popover-foreground border-foreground flex h-48 w-96 flex-col items-center justify-center rounded-lg border-2 border-dashed">
        {isPending ? <LoadingIndicator size="large" /> : <p className="text-foreground text-lg">{L.tree.dropToUpload}</p>}
      </div>
    </div>
  )
}
