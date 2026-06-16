import clsx from "clsx"
import dayjs from "dayjs"
import { ComponentPropsWithoutRef, useEffect } from "react"

import { FileOperation } from "@wr/db"

import { useHoverMenu } from "../../../components/hoverMenu"
import { useFileHistoryRestoreModal } from "../../../components/modals/fileHistoryRestore"
import { useContainerSize } from "../../../contexts/containerSize"
import { useFileGetListHistory } from "../../../hooks/trpc/file"
import { L } from "../../../localization"

type HoverMenuAction = "restore"

type FileHistoryPanelProps = ComponentPropsWithoutRef<"div"> & {
  descId: string
  currentHash: string
  selectedHistoryId?: string
  onClickHistory?: (historyId: string) => void
}

export const FileHistoryPanel = ({ descId, currentHash, selectedHistoryId, onClickHistory, className }: FileHistoryPanelProps) => {
  const { show: showRestoreModal, modal: RestoreModal } = useFileHistoryRestoreModal()
  const {
    data: fileHistoryPages,
    isPending: isFileHistoryPending,
    refetch,
  } = useFileGetListHistory(descId, {
    sortBy: "createdAt",
    sortDirection: "desc",
  })
  const latestCurrentHistory = fileHistoryPages?.pages.flatMap((page) => page.data).find((history) => history.blobHash === currentHash)
  const fileHistories = fileHistoryPages?.pages.flatMap((page) => page.data) ?? []
  const latestHistoryId = fileHistories[0]?.id
  const { height: containerHeight } = useContainerSize()
  const { show: showHoverMenu, menu: HoverMenu } = useHoverMenu<HoverMenuAction>()

  useEffect(() => {
    const contextMenuHandler = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      const historyRow = target.closest(".history")
      if (historyRow) {
        e.preventDefault()
        const historyId = historyRow.getAttribute("data-history-id")
        const operation = historyRow.getAttribute("data-history-operation") as FileOperation | undefined
        const isCurrent = historyRow.hasAttribute("data-current-history")
        const createdAt = historyRow.getAttribute("data-created-at")
        if (!historyId || !operation || !createdAt) return
        showHoverMenu(e, {
          items: isCurrent
            ? [{ action: "restore", label: "Restore", variant: "disabled", disabled: true }]
            : [{ action: "restore", label: "Restore", variant: "default" }],
          onItemClick: (action) => {
            if (isCurrent) return
            if (action === "restore") {
              showRestoreModal({
                onResolve: () => refetch(),
                data: { id: historyId, createdAt: new Date(parseInt(createdAt)), operation: operation as FileOperation },
              })
            }
          },
        })
      }
    }
    document.addEventListener("contextmenu", contextMenuHandler)
    return () => {
      document.removeEventListener("contextmenu", contextMenuHandler)
    }
  }, [])

  return (
    <>
      <div className={clsx("bg-card min-w-48 overflow-y-auto rounded-md", className)} style={{ maxHeight: containerHeight - 48 }}>
        <div className="bg-card sticky top-0 border-b px-4 py-2 text-sm font-medium">{L.file.history.title}</div>
        <div className="max-h-80 flex-1">
          {isFileHistoryPending ? (
            <div className="text-muted p-4 text-center text-sm">{L.file.history.loading}</div>
          ) : fileHistories.length === 0 ? (
            <div className="text-muted p-4 text-center text-sm">{L.file.history.noHistory}</div>
          ) : (
            fileHistories.map((history) => {
              const isCurrent = !!latestCurrentHistory && latestCurrentHistory?.id === history.id
              const dateString = dayjs(history.createdAt).fromNow()
              if (selectedHistoryId === history.id || (latestHistoryId === history.id && !selectedHistoryId)) {
                return (
                  <div
                    key={history.id}
                    className="hover:bg-muted bg-muted history flex cursor-pointer flex-col gap-1 border-b px-4 py-2"
                    onClick={() => onClickHistory?.(history.id)}
                    data-history-id={history.id}
                    data-history-operation={history.operation}
                    data-current-history={isCurrent ? "true" : undefined}
                    data-created-at={history.createdAt.getTime()}
                  >
                    {isCurrent ? (
                      <div className="text-sm font-bold">
                        {">> "}
                        {L.file.history.current}
                      </div>
                    ) : (
                      <div className="text-sm">
                        {">> "}
                        {history.operation}
                      </div>
                    )}

                    <div className="text-muted-foreground text-xs">{history.userName}</div>
                    <div className="text-muted-foreground text-xs">{dateString}</div>
                  </div>
                )
              } else {
                return (
                  <div
                    key={history.id}
                    className="hover:bg-muted history flex cursor-pointer flex-col gap-1 border-b px-4 py-2"
                    onClick={() => onClickHistory?.(history.id)}
                    data-history-id={history.id}
                    data-history-operation={history.operation}
                    data-current-history={isCurrent ? "true" : undefined}
                    data-created-at={history.createdAt.getTime()}
                  >
                    {isCurrent ? (
                      <div className="text-sm font-bold">{L.file.history.current}</div>
                    ) : (
                      <div className="text-sm">{history.operation}</div>
                    )}
                    <div className="text-muted-foreground text-xs">{history?.userName ?? "-"}</div>
                    <div className="text-muted-foreground text-xs">{dateString}</div>
                  </div>
                )
              }
            })
          )}
        </div>
      </div>
      {HoverMenu}
      {RestoreModal}
    </>
  )
}
