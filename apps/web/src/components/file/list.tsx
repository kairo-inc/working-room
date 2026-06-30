import clsx from "clsx"
import dayjs from "dayjs"
import { ArrowLeftIcon } from "lucide-react"
import { useRouter } from "next/router"
import { ComponentPropsWithoutRef, DragEvent, useEffect, useRef, useState } from "react"

import { useNotification } from "../../contexts/notification"
import { useIsAdminOrOwner } from "../../contexts/setting"
import { useFileCopy, useFileMove } from "../../hooks/trpc/file"
import { L } from "../../localization"
import { Route } from "../../route"
import { AppFileDescriptor } from "../../types/file"
import { useHoverMenu } from "../hoverMenu"
import { LoadingIndicator } from "../indicator"
import { useAccessGroupCreateModal } from "../modals/accessGroupCreate"
import { useDirectoryCreateModal } from "../modals/directoryCreate"
import { useFileRenameModal } from "../modals/fileRename"
import { useFileDeleteModal } from "../modals/filesDelete"
import { FileIconSm } from "./item"

type HoverMenuAction = "delete" | "rename" | "copy" | "newFolder" | "accessGroup"

type FileListProps = ComponentPropsWithoutRef<"table"> & {
  parent: AppFileDescriptor
  data: AppFileDescriptor[]
  isPending?: boolean
  refetchFiles?: () => void
}

export const FileList = ({ data, parent, isPending, className, refetchFiles, ...props }: FileListProps) => {
  const router = useRouter()
  const isAdminOrOwner = useIsAdminOrOwner()
  const gridHeaderClassName = "grid border-b py-1 grid-cols-[minmax(0,1fr)_minmax(80px,160px)_minmax(100px,180px)] text-sm"
  const gridRowClassName = `${gridHeaderClassName} py-2 bg-card hover:bg-muted cursor-pointer text-sm`
  const selectedRowClassName = "!bg-link/20 !text-link text-sm"
  const sortedFiles = [...data].sort((a, b) => {
    if (a.isDirectory === b.isDirectory) {
      return a.name.localeCompare(b.name)
    }
    return a.isDirectory ? -1 : 1
  })
  const placeholder = (
    <div className={gridRowClassName}>
      <div className={`flex cursor-pointer items-center gap-2 pl-8 text-ellipsis whitespace-nowrap`}>{L.file.list.noFiles}</div>
      <div className={`text-muted-foreground pl-4 font-medium`}></div>
      <div className={`text-muted-foreground pr-2 pl-4 font-medium`}></div>
    </div>
  )

  const [selectedFileIds, setSelectedFileIds] = useState<string[]>([])
  const rubberBandStart = useRef<{ x: number; y: number } | null>(null)
  const [rubberBandRect, setRubberBandRect] = useState<{ left: number; top: number; width: number; height: number } | null>(null)
  const wasRubberBandSelection = useRef(false)
  const notify = useNotification()
  const { mutateAsync: copyFile } = useFileCopy()
  const { mutateAsync: moveFile } = useFileMove()
  const { show: showRenameModal, modal: RenameModal } = useFileRenameModal()
  const { show: showDeleteModal, modal: DeleteModal } = useFileDeleteModal()
  const { show: showAccessGroupCreateModal, modal: AccessGroupCreateModal } = useAccessGroupCreateModal()
  const { show: showCreateDirectoryModal, modal: CreateDirectoryModal } = useDirectoryCreateModal()
  const { show: showHoverMenu, menu: HoverMenu } = useHoverMenu<HoverMenuAction>()

  useEffect(() => {
    const clickOutsideHandler = (e: MouseEvent) => {
      if (wasRubberBandSelection.current) {
        wasRubberBandSelection.current = false
        return
      }
      const target = e.target as HTMLElement
      const contextMenuArea = target.closest(".file-item") as HTMLElement | null
      if (!contextMenuArea) {
        setSelectedFileIds([])
      }
    }

    const handleContextMenu = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      const fileItem = target.closest(".file-item") as HTMLElement | null
      const contextMenuArea = target.closest(".context-menu") as HTMLElement | null
      if (fileItem) {
        e.preventDefault()
        const descId = fileItem?.getAttribute("data-file-id")
        let handlingFileIds = selectedFileIds
        if (descId && !selectedFileIds.includes(descId)) {
          setSelectedFileIds([descId])
          handlingFileIds = [descId]
        } else if (selectedFileIds.length === 0 && descId) {
          setSelectedFileIds([descId])
          handlingFileIds = [descId]
        }

        const targetFile = data.find((file) => file.id === descId)
        if (!targetFile) {
          return
        }
        const multipleSelection = handlingFileIds.length > 1
        const isDirectory = !multipleSelection && targetFile.isDirectory
        const containsDirectory = handlingFileIds.some((id) => {
          const item = data.find((file) => file.id === id)
          return item?.isDirectory
        })

        if (descId) {
          showHoverMenu(e, {
            items: [
              { action: "newFolder", label: L.file.list.newFolder, variant: "default" },
              {
                action: "rename",
                label: L.file.list.rename,
                variant: multipleSelection ? "disabled" : "default",
                disabled: multipleSelection,
              },
              {
                action: "copy",
                label: L.file.list.copyTitle,
                variant: containsDirectory ? "disabled" : "default",
                disabled: containsDirectory,
              },
              {
                action: "accessGroup",
                label: L.file.list.accessGroup,
                variant: isAdminOrOwner && isDirectory ? "default" : "disabled",
                disabled: !isAdminOrOwner || !isDirectory,
              },
              { action: "delete", label: L.file.list.delete, variant: "destructive" },
            ],
            onItemClick: async (action) => {
              switch (action) {
                case "delete": {
                  const descList = data.filter((file) => handlingFileIds.includes(file.id))
                  showDeleteModal({ data: descList, onResolve: refetchFiles })
                  break
                }
                case "newFolder": {
                  showCreateDirectoryModal({ data: { id: parent.id }, onResolve: refetchFiles })
                  break
                }
                case "rename": {
                  if (!multipleSelection) {
                    const desc = data.find((file) => file.id === descId)!
                    showRenameModal({ data: desc, onResolve: refetchFiles })
                  }
                  break
                }
                case "copy": {
                  try {
                    await copyFile({ descId })
                    refetchFiles?.()
                    notify.info(L.file.list.copyTitle, L.file.list.copySuccess)
                    router.replace(router.asPath)
                  } catch (e) {
                    notify.error(L.file.list.copyTitle, e.message)
                  }
                  break
                }
                case "accessGroup": {
                  if (!multipleSelection && isAdminOrOwner && isDirectory) {
                    const desc = data.find((file) => file.id === descId)!
                    showAccessGroupCreateModal({ data: desc })
                  }
                  break
                }
              }
            },
          })
        }
      } else if (contextMenuArea) {
        e.preventDefault()
        showHoverMenu(e, {
          items: [
            { action: "newFolder", label: L.file.list.newFolder, variant: "default" },
            { action: "rename", label: L.file.list.rename, variant: "disabled", disabled: true },
            { action: "delete", label: L.file.list.delete, variant: "disabled", disabled: true },
          ],
          onItemClick: (action) => {
            if (action === "newFolder") {
              showCreateDirectoryModal({ data: { id: parent.id }, onResolve: refetchFiles })
              return
            }
          },
        })
      }
    }
    document.addEventListener("contextmenu", handleContextMenu)
    document.addEventListener("click", clickOutsideHandler)
    return () => {
      document.removeEventListener("contextmenu", handleContextMenu)
      document.removeEventListener("click", clickOutsideHandler)
    }
  }, [selectedFileIds])

  useEffect(() => {
    const handleMouseDown = (e: MouseEvent) => {
      if (e.button !== 0) return
      const target = e.target as HTMLElement | null
      if (target?.closest?.(".file-item")) return
      e.preventDefault()
      rubberBandStart.current = { x: e.clientX, y: e.clientY }
      setRubberBandRect({ left: e.clientX, top: e.clientY, width: 0, height: 0 })
    }

    const handleMouseMove = (e: MouseEvent) => {
      if (!rubberBandStart.current) return
      const { x: startX, y: startY } = rubberBandStart.current
      const left = Math.min(startX, e.clientX)
      const top = Math.min(startY, e.clientY)
      const right = Math.max(startX, e.clientX)
      const bottom = Math.max(startY, e.clientY)
      setRubberBandRect({ left, top, width: right - left, height: bottom - top })
      const newSelection: string[] = []
      document.querySelectorAll(".file-item").forEach((item) => {
        const rect = item.getBoundingClientRect()
        if (rect.left < right && rect.right > left && rect.top < bottom && rect.bottom > top) {
          const id = item.getAttribute("data-file-id")
          if (id) newSelection.push(id)
        }
      })
      setSelectedFileIds(newSelection)
    }

    const handleMouseUp = (e: MouseEvent) => {
      if (!rubberBandStart.current) return
      const hasDragged = Math.abs(e.clientX - rubberBandStart.current.x) > 4 || Math.abs(e.clientY - rubberBandStart.current.y) > 4
      if (hasDragged) {
        wasRubberBandSelection.current = true
      }
      rubberBandStart.current = null
      setRubberBandRect(null)
    }

    document.addEventListener("mousedown", handleMouseDown)
    document.addEventListener("mousemove", handleMouseMove)
    document.addEventListener("mouseup", handleMouseUp)
    return () => {
      document.removeEventListener("mousedown", handleMouseDown)
      document.removeEventListener("mousemove", handleMouseMove)
      document.removeEventListener("mouseup", handleMouseUp)
    }
  }, [])

  const handleOnDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    e.currentTarget.style.backgroundColor = "var(--muted)"
    e.currentTarget.style.cursor = "move"
  }

  const handleOnDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    e.currentTarget.style.backgroundColor = ""
    e.currentTarget.style.cursor = ""
    document.querySelectorAll(".ghost").forEach((ghost) => ghost.remove())
  }

  const handleOnDrop = async (e: DragEvent<HTMLDivElement>, targetFolderId?: string) => {
    try {
      const descId = e.dataTransfer.getData("text/plain")
      if (!descId || !targetFolderId) {
        notify.error(L.file.list.moveTitle, L.file.list.moveInvalid)
        return
      } else if (descId === targetFolderId) {
        return
      }
      const descIds = descId.split(",")
      for (const id of descIds) {
        await moveFile({ descId: id, targetFolderId })
      }
      notify.info(L.file.list.moveTitle, L.file.list.moveSuccess)
      router.replace(router.asPath)
    } catch (e) {
      notify.error(L.file.list.moveTitle, e.message)
    } finally {
      document.querySelectorAll(".ghost").forEach((ghost) => ghost.remove())
      e.dataTransfer.clearData()
      setSelectedFileIds([])
    }
  }

  return (
    <>
      {rubberBandRect && rubberBandRect.width > 0 && rubberBandRect.height > 0 && (
        <div
          style={{
            position: "fixed",
            left: rubberBandRect.left,
            top: rubberBandRect.top,
            width: rubberBandRect.width,
            height: rubberBandRect.height,
            border: "1.5px solid var(--color-link, #60a5fa)",
            backgroundColor: "color-mix(in srgb, var(--color-link, #60a5fa) 10%, transparent)",
            pointerEvents: "none",
            zIndex: 50,
          }}
        />
      )}
      <div className={clsx("w-full text-base", className)} {...props}>
        <div className={gridHeaderClassName}>
          <div className={`text-muted-foreground pl-8 font-medium`}>{L.file.list.name}</div>
          <div className={`text-muted-foreground pl-4 font-medium`}>{L.file.list.type}</div>
          <div className={`text-muted-foreground pr-2 pl-4 font-medium`}>{L.file.list.modified}</div>
        </div>
        {isPending ? (
          <div className="bg-card border-border border-b py-4">
            <LoadingIndicator className="m-auto" />
          </div>
        ) : (
          <>
            {parent && !parent.isRoot && (
              <div
                className={gridRowClassName}
                onClick={() => router.push(Route.tree(parent.parentId || ""))}
                onDragOver={(e) => handleOnDragOver(e)}
                onDragLeave={(e) => handleOnDragLeave(e)}
                onDrop={async (e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  e.currentTarget.style.backgroundColor = ""
                  e.currentTarget.style.cursor = ""
                  await handleOnDrop(e, parent.parentId)
                }}
              >
                <div className={`flex cursor-pointer items-center gap-2 pl-2 text-ellipsis whitespace-nowrap select-none`}>
                  <ArrowLeftIcon className="size-4" />
                  {L.file.list.back}
                </div>
                <div className={`text-muted-foreground pl-4 font-medium`}></div>
                <div className={`text-muted-foreground pr-2 pl-4 font-medium`}></div>
              </div>
            )}
            {sortedFiles.length > 0
              ? sortedFiles.map((file) => {
                  const { id, name, mimeType, mtime, isDirectory } = file
                  const isSelected = selectedFileIds.includes(id)
                  return (
                    <div
                      key={id}
                      draggable
                      className={clsx("file-item", gridRowClassName, isSelected ? selectedRowClassName : "")}
                      data-file-id={id}
                      data-file-mime-type={mimeType}
                      onDoubleClick={() => {
                        if (isDirectory) {
                          router.push(Route.tree(id))
                        } else {
                          router.push(Route.file(id))
                        }
                      }}
                      onClick={(e) => {
                        if (e.shiftKey) {
                          // If shift key is pressed, allow multiple selection.
                          setSelectedFileIds((prev) => {
                            if (prev.includes(id)) {
                              return prev.filter((fileId) => fileId !== id)
                            } else {
                              return [...prev, id]
                            }
                          })
                        } else {
                          setSelectedFileIds([id])
                        }
                      }}
                      onDragStart={(e) => {
                        e.dataTransfer.effectAllowed = "move"
                        if (selectedFileIds.includes(id)) {
                          const ghost = document.createElement("div")
                          ghost.className = "ghost"
                          ghost.textContent = L.file.list.dragItems.replace("{0}", String(selectedFileIds.length))
                          ghost.style.position = "absolute"
                          ghost.style.top = "-9999px"
                          ghost.style.left = "-9999px"
                          ghost.style.padding = "4px 8px"
                          ghost.style.color = "var(--foreground)"
                          ghost.style.cursor = "grabbing"
                          document.body.appendChild(ghost)
                          e.dataTransfer.setDragImage(ghost, 0, 0)
                          e.dataTransfer.setData("text/plain", selectedFileIds.join(","))
                        } else {
                          e.dataTransfer.setData("text/plain", id)
                        }
                      }}
                      onDragOver={(e) => handleOnDragOver(e)}
                      onDragLeave={(e) => handleOnDragLeave(e)}
                      onDrop={async (e) => {
                        e.preventDefault()
                        e.stopPropagation()
                        e.currentTarget.style.backgroundColor = ""
                        e.currentTarget.style.cursor = ""
                        const currentTargetMimeType = e.currentTarget.getAttribute("data-file-mime-type") || ""
                        const isDirectory = currentTargetMimeType === "inode/directory"
                        const targetFolderId = e.currentTarget.getAttribute("data-file-id") || undefined
                        if (isDirectory) {
                          await handleOnDrop(e, targetFolderId)
                        }
                      }}
                    >
                      <div className={`flex min-w-0 cursor-pointer items-center gap-2 pl-2 text-ellipsis whitespace-nowrap`}>
                        <FileIconSm type={mimeType} className="shrink-0" />
                        <span className="min-w-0 truncate">{name}</span>
                      </div>
                      <div className={`text-muted-foreground pl-4`}>{isDirectory ? "-" : mimeType.split("/").pop()}</div>
                      <div className={`text-muted-foreground pr-2 pl-4`}>{dayjs(mtime).fromNow()}</div>
                    </div>
                  )
                })
              : placeholder}
          </>
        )}
      </div>
      {HoverMenu}
      {CreateDirectoryModal}
      {DeleteModal}
      {RenameModal}
      {AccessGroupCreateModal}
    </>
  )
}
