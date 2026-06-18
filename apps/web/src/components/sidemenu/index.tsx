import { Blend, Folder, MessageSquareText, Moon, Plus, Settings, Sun } from "lucide-react"
import { useTheme } from "next-themes"
import { useRouter } from "next/router"

import { useIsAdminOrOwner } from "../../contexts/setting"
import { L } from "../../localization"
import { Route } from "../../route"
import { LogoIcon } from "../asset/logo"
import { Avatar } from "../avatar"
import { SideMenuButton } from "./button"

export const SideMenu = () => {
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

  return (
    <aside className="bg-card flex min-h-0 w-59 flex-col">
      <div className="flex h-16 items-center px-4">
        <a href="/" className="flex items-center justify-start gap-2 transition-opacity hover:opacity-80">
          <LogoIcon size={size} />
          <span className="text-primary text-lg font-bold">WorkingRoom</span>
        </a>
      </div>
      <div className="flex flex-1 flex-col items-center justify-between overflow-y-auto">
        <nav className="w-full">
          <SideMenuButton
            label={L.sidemenu.newChat}
            icon={<Plus size={size} />}
            variant={isNewChat ? "selected" : "default"}
            href={Route.chat()}
          />
          <SideMenuButton
            label={L.sidemenu.chat}
            icon={<MessageSquareText size={size} />}
            variant={getVariant([Route.chat(), Route.home()])}
            href={Route.home()}
          />
          <SideMenuButton label={"Agents"} icon={<Blend size={size} />} variant={getVariant([Route.agent()])} href={Route.agent()} />
          <SideMenuButton
            label={L.sidemenu.folder}
            icon={<Folder size={size} />}
            variant={getVariant([Route.file(""), Route.tree()])}
            href={Route.tree()}
          />
          {showSettingItem && (
            <SideMenuButton
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
            className="text-muted-foreground hover:bg-muted hover:text-foreground flex w-full cursor-pointer items-center gap-3 py-2.5 pl-4 text-sm font-normal transition-colors"
          >
            {resolvedTheme === "dark" ? <Sun size={size} /> : <Moon size={size} />}
            {resolvedTheme === "dark" ? L.sidemenu.mode.light : L.sidemenu.mode.dark}
          </button>
          <Avatar className="w-full" href={Route.account()} />
        </div>
      </div>
    </aside>
  )
}
