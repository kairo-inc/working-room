import { Edit, Plus, RefreshCw, Trash2 } from "lucide-react"
import { useRouter } from "next/router"

import { useNotification } from "../../../contexts/notification"
import { useMcpServerEdit, useMcpServerRefreshTools } from "../../../hooks/trpc/mcpServer"
import { L } from "../../../localization"
import { AppMcpServer } from "../../../types/mcpServer"
import { IconButton } from "../../buttons/iconButton"
import { RectangleButton } from "../../buttons/rectangleButton"
import { VerticalAligned3Items } from "../../layout/verticalAligned3Items"
import { useMcpServerDeleteModal } from "../../modals/mcpServerDelete"
import { useMcpServerEditModal } from "../../modals/mcpServerEdit"
import { Section } from "../../section"

type McpServerSectionProps = {
  mcpServers: AppMcpServer[]
}

const statusText = (server: AppMcpServer) => {
  if (!server.enabled) return L.account.mcpServer.disabled
  if (!server.toolsFetchedAt) return L.account.mcpServer.notFetched
  return L.account.mcpServer.tools.replace("{0}", String(server.toolNames.length))
}

export const McpServerSection = ({ mcpServers }: McpServerSectionProps) => {
  const router = useRouter()
  const notify = useNotification()
  const { show: showEditModal, modal: EditModal } = useMcpServerEditModal()
  const { show: showDeleteModal, modal: DeleteModal } = useMcpServerDeleteModal()
  const { mutateAsync: editMcpServer, isPending: isEditing } = useMcpServerEdit()
  const { mutateAsync: refreshTools, isPending: isRefreshing } = useMcpServerRefreshTools()
  const isPending = isEditing || isRefreshing

  const addButton = (
    <IconButton size="default" icon={<Plus />} aria-label={L.modal.mcpServerEdit.createTitle} onClick={() => showEditModal({})} />
  )

  return (
    <Section title={L.account.mcpServer.title} tail={addButton}>
      <div className="text-muted-foreground mb-4 text-sm">{L.account.mcpServer.description}</div>
      {mcpServers.length === 0 ? (
        <div className="text-muted-foreground text-sm">{L.account.mcpServer.empty}</div>
      ) : (
        <VerticalAligned3Items
          items={mcpServers.map((server) => ({
            col1: (
              <div className="flex min-w-0 flex-col">
                <span className="text-foreground">{server.name}</span>
                <span className="text-muted-foreground truncate text-xs">{server.url}</span>
              </div>
            ),
            col2: <span className="text-muted-foreground text-sm">{statusText(server)}</span>,
            col3: (
              <div className="flex items-center gap-2">
                <RectangleButton
                  size="sm"
                  variant="defaultOutline"
                  disabled={isPending}
                  onClick={async () => {
                    try {
                      await editMcpServer({ id: server.id, enabled: !server.enabled })
                      router.replace(router.asPath)
                    } catch (error) {
                      notify.error(L.account.mcpServer.toggleFailed, error.message)
                    }
                  }}
                >
                  {server.enabled ? L.account.mcpServer.disable : L.account.mcpServer.enable}
                </RectangleButton>
                <IconButton
                  icon={<RefreshCw size={18} />}
                  aria-label={L.account.mcpServer.refreshTools}
                  title={L.account.mcpServer.refreshTools}
                  disabled={isPending}
                  onClick={async () => {
                    try {
                      await refreshTools({ id: server.id })
                      notify.info(L.account.mcpServer.refreshed, server.name)
                      router.replace(router.asPath)
                    } catch (error) {
                      notify.error(L.account.mcpServer.refreshFailed, error.message)
                    }
                  }}
                />
                <IconButton
                  icon={<Edit size={18} />}
                  aria-label={L.modal.mcpServerEdit.editTitle}
                  disabled={isPending}
                  onClick={() => showEditModal({ data: server })}
                />
                <IconButton
                  icon={<Trash2 size={18} />}
                  aria-label={L.modal.mcpServerDelete.title}
                  disabled={isPending}
                  onClick={() => showDeleteModal({ data: server })}
                />
              </div>
            ),
          }))}
        />
      )}
      {EditModal}
      {DeleteModal}
    </Section>
  )
}
