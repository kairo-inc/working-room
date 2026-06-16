import clsx from "clsx"
import { ComponentPropsWithoutRef, useCallback, useEffect, useState } from "react"

import { Route } from "../../route"
import { LoadingIndicator } from "../indicator"

type PdfThumbnailProps = ComponentPropsWithoutRef<"embed"> & {
  descId: string
}

type PdfState = { status: "idle" } | { status: "loading" } | { status: "ready"; url: string } | { status: "error"; message: string }

export const PdfThumbnail = ({ descId, className, ...rest }: PdfThumbnailProps) => {
  const [pdf, setPdf] = useState<PdfState>({ status: "idle" })

  const loadPdf = useCallback(async () => {
    setPdf({ status: "loading" })

    try {
      const res = await fetch(Route.fileContent(descId))
      if (!res.ok) {
        setPdf({ status: "error", message: `${res.status} ${res.statusText}` })
        return
      }

      const blob = await res.blob()

      if (blob.type && blob.type !== "application/pdf") {
        setPdf({ status: "error", message: "Not a PDF file" })
        return
      }

      const objectUrl = URL.createObjectURL(blob)
      setPdf({ status: "ready", url: objectUrl })
    } catch {
      setPdf({ status: "error", message: "Failed to load PDF" })
    }
  }, [descId])

  useEffect(() => {
    loadPdf()

    return () => {
      setPdf((current) => {
        if (current.status === "ready") {
          URL.revokeObjectURL(current.url)
        }
        return current
      })
    }
  }, [loadPdf])

  const renderContent = () => {
    if (pdf.status === "loading") return <LoadingIndicator />
    if (pdf.status === "error") return <img src="/notfound.svg" alt="Failed to load PDF" className="h-full w-full object-cover" />
    if (pdf.status === "ready") {
      return (
        <>
          <embed src={pdf.url} type="application/pdf" className="h-full w-full" />
          <a href={pdf.url} target="_blank" rel="noopener noreferrer" className="absolute inset-0" />
        </>
      )
    }
    return <></>
  }

  return (
    <div className={clsx("bg-card relative h-24 w-40 rounded border object-cover", className)} {...rest}>
      {renderContent()}
    </div>
  )
}

PdfThumbnail.displayName = "PdfThumbnail"
