import clsx from "clsx"
import { Blend, Folder, MessageSquareText, Moon, Plus, Settings, Sun } from "lucide-react"
import { useTheme } from "next-themes"
import { useRouter } from "next/router"

import { useIsAdminOrOwner } from "../../contexts/setting"
import { L } from "../../localization"
import { Route } from "../../route"
import { LogoIcon } from "../asset/logo"
import { Avatar } from "../avatar"
import { SideMenuButton } from "./button"

type SideMenuProps = {
  isMobileOpen?: boolean
  onMobileClose?: () => void
}

export const SideMenu = ({ isMobileOpen = false, onMobileClose }: SideMenuProps) => {
  const router = useRouter()
  const showSettingItem = useIsAdminOrOwner()
  const { resolvedTheme, setTheme } = useTheme()
  const size = 20
  const currentPath = router.asPath
  const firstRoute = `/${currentPath.split("/")[1] ?? ""}`
  const isNewChat = currentPath === Route.chat()

  const getVariant = (paths: string[]): "selected" | "default" => {
    const routeParts = paths.map((path) => `/${path.split("/")[1] ?? ""}`)
    if (!isNewChat && routeParts.includes(firstRoute)) {
      return "selected"
    }
    return "default"
  }

  const navContent = (showLabels: boolean) => (
    <>
      <div className="flex h-16 items-center pl-4.5">
        <a href="/" className="flex items-center justify-start gap-2.5 transition-opacity hover:opacity-80">
          <LogoIcon size={size + 4} />
          <span className={clsx("text-primary text-lg font-bold", showLabels ? "block" : "hidden lg:block")}>WorkingRoom</span>
        </a>
      </div>
      <div className="flex flex-1 flex-col items-center justify-between overflow-y-auto">
        <nav className="w-full">
          <SideMenuButton
            showLabel={showLabels}
            label={L.sidemenu.newChat}
            icon={<Plus size={size} />}
            variant={isNewChat ? "selected" : "default"}
            href={Route.chat()}
          />
          <SideMenuButton
            showLabel={showLabels}
            label={L.sidemenu.chat}
            icon={<MessageSquareText size={size} />}
            variant={getVariant([Route.chat(), Route.home()])}
            href={Route.home()}
          />
          <SideMenuButton
            showLabel={showLabels}
            label={L.sidemenu.agents}
            icon={<Blend size={size} />}
            variant={getVariant([Route.agent()])}
            href={Route.agent()}
          />
          <SideMenuButton
            showLabel={showLabels}
            label={L.sidemenu.folder}
            icon={<Folder size={size} />}
            variant={getVariant([Route.file(""), Route.tree()])}
            href={Route.tree()}
          />
          {showSettingItem && (
            <SideMenuButton
              showLabel={showLabels}
              label={L.sidemenu.setting}
              icon={<Settings size={size} />}
              variant={getVariant([Route.setting()])}
              href={Route.setting()}
            />
          )}
        </nav>
        <div className="w-full">
          <button
            onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
            className="text-muted-foreground hover:bg-muted hover:text-foreground flex h-12 w-full cursor-pointer items-center gap-3 pl-5 text-sm font-normal transition-colors"
          >
            {resolvedTheme === "dark" ? <Sun size={size} /> : <Moon size={size} />}
            <div className={showLabels ? "block" : "hidden lg:block"}>
              {resolvedTheme === "dark" ? L.sidemenu.mode.light : L.sidemenu.mode.dark}
            </div>
          </button>
          <Avatar className="w-full" href={Route.account()} showLabel={showLabels} />
        </div>
      </div>
    </>
  )

  return (
    <>
      {/* Desktop sidebar: hidden on mobile */}
      <aside className="bg-card hidden min-h-0 w-16 shrink-0 flex-col sm:flex lg:w-52">{navContent(false)}</aside>

      {/* Mobile drawer */}
      {isMobileOpen && (
        <>
          <div className="fixed inset-0 z-40 bg-black/50 sm:hidden" onClick={onMobileClose} />
          <aside className="bg-card fixed inset-y-0 left-0 z-50 flex w-64 flex-col sm:hidden">{navContent(true)}</aside>
        </>
      )}
    </>
  )
}
