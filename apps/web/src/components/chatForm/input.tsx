import { type VariantProps, cva } from "class-variance-authority"
import clsx from "clsx"
import { type ChangeEvent, type HTMLAttributes, useCallback, useEffect, useRef, useState } from "react"
import { useField } from "react-final-form"

import { L } from "../../localization"
import { FileItem } from "./fileItem"

const MAX_ROWS = 10
const DEFAULT_TEXTAREA_PADDING_TOP = 16
const FILE_PREVIEW_VERTICAL_PADDING = 16

const variants = cva(
  "resize-none rounded-md border border-border bg-input-background p-4 pr-14 text-base focus:border-transparent focus:ring-2",
  {
    variants: {
      variant: {
        default: "focus:ring-ring focus:outline-none",
        error: "border-destructive focus:ring-destructive focus:outline-none",
        disabled: "cursor-not-allowed disabled:border-disabled-border disabled:bg-disabled disabled:text-disabled-foreground",
      },
    },
  }
)

type Variants = VariantProps<typeof variants>
type VariantNames = Variants["variant"]
type ChatFormFile = { file: File; isUploading: boolean; id?: string }

interface ChatFormInputProps extends HTMLAttributes<HTMLTextAreaElement> {
  formName: string
  fileFormName: string
  variant?: VariantNames
  isPending?: boolean
}

export const ChatFormInput = ({ formName, fileFormName, variant = "default", isPending, className, ...props }: ChatFormInputProps) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const fileSpaceRef = useRef<HTMLDivElement>(null)
  const [numRows, setNumRows] = useState(1)
  const {
    input: { onChange: finalOnChange, ...input },
  } = useField<string>(formName, { type: "textarea", beforeSubmit: () => setNumRows(1) })
  const {
    input: { onChange: fileOnChange, value: fileValue, ...fileInput },
  } = useField<ChatFormFile[]>(fileFormName, { type: "file" })

  const files = Array.isArray(fileValue) ? fileValue : []
  const textValue = typeof input.value === "string" ? input.value : ""
  const hasFiles = files.length > 0

  const calculateRows = useCallback((value: string) => {
    const textarea = textareaRef.current
    if (!textarea) {
      return 1
    }

    const lines = value.split("\n")
    let lineCount = lines.length
    const computedStyle = getComputedStyle(textarea)
    const paddingLeft = Number(computedStyle.paddingLeft?.replace("px", "") || "0")
    const paddingRight = Number(computedStyle.paddingRight?.replace("px", "") || "0")
    const inputWidth = textarea.clientWidth - paddingLeft - paddingRight
    if (inputWidth <= 0) {
      return 1
    }

    const canvas = document.createElement("canvas")
    const context = canvas.getContext("2d")
    if (!context) {
      return Math.min(Math.max(lineCount, 1), MAX_ROWS)
    }

    context.font = computedStyle.font
    for (const line of lines) {
      const width = context.measureText(line).width
      const estimatedRows = Math.ceil(width / inputWidth)
      lineCount += Math.max(estimatedRows - 1, 0)
    }

    return Math.min(Math.max(lineCount, 1), MAX_ROWS)
  }, [])

  const syncTextareaPadding = useCallback(() => {
    if (!fileSpaceRef.current || !textareaRef.current) {
      return
    }

    const fileSpaceHeight = fileSpaceRef.current.clientHeight
    textareaRef.current.style.paddingTop =
      fileSpaceHeight === 0 ? `${DEFAULT_TEXTAREA_PADDING_TOP}px` : `${fileSpaceHeight + FILE_PREVIEW_VERTICAL_PADDING}px`
  }, [])

  const handleChange = (e: ChangeEvent<HTMLTextAreaElement>) => {
    finalOnChange(e)
    setNumRows(calculateRows(e.target.value))
  }

  const handleRemoveFile = (removedFile: File) => {
    fileOnChange(files.filter((currentFile) => currentFile.file !== removedFile))
  }

  useEffect(() => {
    const handleResize = () => {
      syncTextareaPadding()
      setNumRows(calculateRows(textValue))
    }

    window.addEventListener("resize", handleResize)
    return () => {
      window.removeEventListener("resize", handleResize)
    }
  }, [calculateRows, syncTextareaPadding, textValue])

  useEffect(() => {
    syncTextareaPadding()
    setNumRows(calculateRows(textValue))
  }, [calculateRows, files, syncTextareaPadding, textValue])

  return (
    <>
      <div className="absolute top-2 flex flex-wrap items-start justify-start gap-2 px-2" ref={fileSpaceRef}>
        {(hasFiles ? files : []).map((file, index) => (
          <FileItem key={index} file={file.file} isUploading={file.isUploading} onRemove={handleRemoveFile} />
        ))}
      </div>
      {/* This hidden input is to trigger re-render when file input changes */}
      <input type="file" className="hidden" {...fileInput} multiple />

      {/* Textarea */}
      <textarea
        ref={textareaRef}
        className={clsx(variants({ variant }), className)}
        {...input}
        {...props}
        disabled={isPending}
        rows={numRows}
        placeholder={L.chat.inputPlaceholder}
        onChange={handleChange}
      />
    </>
  )
}
