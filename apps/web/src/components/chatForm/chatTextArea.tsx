import { cva } from "class-variance-authority"
import clsx from "clsx"
import { FilePlus, Forward } from "lucide-react"
import { ComponentPropsWithoutRef, useCallback, useEffect, useRef } from "react"
import { useField, useForm } from "react-final-form"

import { useFileUploadFileToChat } from "../../hooks/trpc/file"
import { L } from "../../localization"
import { IconButton } from "../buttons/iconButton"
import { FileUploadPane } from "../file/upload"
import { FileItem } from "./fileItem"

const MAX_ROWS = 10

const variants = cva(
  "resize-none rounded-md border-none outline outline-border bg-input-background flex-1 text-sm focus:outline-transparent focus:ring-2 py-4 ml-10 pl-3 pr-14",
  {
    variants: {
      variant: {
        default: "focus:ring-ring",
        error: "border-destructive focus:ring-destructive",
        disabled: "cursor-not-allowed disabled:border-disabled-border disabled:bg-disabled disabled:text-disabled-foreground",
      },
    },
  }
)

type ChatFormFile = { file: File; isUploading: boolean; meta?: { descId: string; blobHash: string; mimeType: string } }

type ChatInputFormType = {
  chatMessage: string
  fileUpload: ChatFormFile[]
}

type ChatTextAreaProps = ComponentPropsWithoutRef<"textarea"> & {
  chatId: string
  isDisabled?: boolean
}

export const ChatTextArea = ({ chatId, className, isDisabled, ...props }: ChatTextAreaProps) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const fileSpaceRef = useRef<HTMLDivElement>(null)
  const { mutateAsync: uploadFile } = useFileUploadFileToChat()
  const { getFieldState, change } = useForm<ChatInputFormType>()

  const { input } = useField<string>("chatMessage", { type: "textarea" })
  const {
    input: { value, ...fileInput },
  } = useField<ChatFormFile[]>("fileUpload", { type: "file" })

  const files = Array.isArray(value) ? value : []
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

  const resizeTextarea = useCallback(() => {
    const textarea = textareaRef.current
    const fileSpace = fileSpaceRef.current
    if (!textarea || !fileSpace) {
      return
    }
    const fileSpaceHeight = fileSpace.offsetHeight
    textarea.rows = calculateRows(input.value)
    if (fileSpaceHeight > 0) {
      textarea.style.paddingTop = `${fileSpaceHeight + 24}px`
    } else {
      textarea.style.paddingTop = `16px`
    }
  }, [files, calculateRows])

  const handleRemoveFile = useCallback(
    (file: File) => {
      const currentFiles = getFieldState("fileUpload")?.value || []
      change(
        "fileUpload",
        currentFiles.filter((f) => f.file !== file)
      )
    },
    [change]
  )

  const handleFileUpload = useCallback(
    async (files: File[]) => {
      const currentFiles = getFieldState("fileUpload")?.value || []
      const uniqueFiles = files.filter((f) => !currentFiles.some((cf) => cf.file.name === f.name && cf.file.size === f.size))
      if (uniqueFiles.length === 0) {
        return
      }
      // Add pending files to the form state
      change("fileUpload", [...currentFiles, ...uniqueFiles.map((f) => ({ file: f, isUploading: true }))])

      // Upload files and update form state with results
      const descs = await Promise.all(
        uniqueFiles.map(async (f) => {
          const formData = new FormData()
          formData.append("file", f)
          formData.append("chatId", chatId)
          try {
            const { id, blobHash, mimeType } = await uploadFile(formData)
            return {
              file: f,
              isUploading: false,
              meta: {
                descId: id,
                blobHash,
                mimeType,
              },
            }
          } catch (e) {
            return { file: f, isUploading: false }
          }
        })
      )
      change("fileUpload", [...currentFiles, ...descs])
    },
    [change, getFieldState, uploadFile]
  )

  useEffect(() => {
    resizeTextarea()
  }, [files, resizeTextarea])

  return (
    <>
      <div className={clsx("relative flex w-full gap-2 pt-4")}>
        <IconButton
          size="lg"
          icon={<FilePlus />}
          tabIndex={-1}
          className="absolute bottom-2.25 -left-1"
          onClick={() => document.getElementById("fileUploadInput")?.click()}
        />
        <div ref={fileSpaceRef} className="absolute top-6 ml-12 flex flex-wrap gap-2">
          {files?.map((file, index) => (
            <FileItem key={index} file={file.file} isUploading={file.isUploading} onRemove={handleRemoveFile} />
          ))}
        </div>
        <textarea
          id="chatTextArea"
          ref={textareaRef}
          className={clsx(variants({ variant: "default" }), className)}
          rows={calculateRows(input.value)}
          placeholder={L.chat.inputPlaceholder}
          {...input}
          {...props}
        />
        <input
          {...fileInput}
          className="hidden"
          id="fileUploadInput"
          multiple
          type="file"
          onChange={(e) => handleFileUpload(Array.from(e.target.files || []))}
        />
        <button
          className="bg-primary disabled:bg-primary/50 text-primary-foreground hover:bg-primary/70 absolute right-2 bottom-2.25 flex h-10 w-10 cursor-pointer items-center justify-center rounded-md transition-colors disabled:cursor-not-allowed"
          disabled={isDisabled}
          type="submit"
        >
          <Forward />
        </button>
      </div>
      <FileUploadPane onFileUpload={handleFileUpload} />
    </>
  )
}
