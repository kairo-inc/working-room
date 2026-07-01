import clsx, { ClassValue } from "clsx"
import { Menu } from "lucide-react"
import { ComponentPropsWithoutRef, useState } from "react"

import { elementIds } from "../elementId"
import { SideMenu } from "../sidemenu"

type PageLayoutProps = ComponentPropsWithoutRef<"div"> & {
  containerClassName?: ClassValue
}

export const PageLayout = ({ children, containerClassName, ...props }: PageLayoutProps) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  return (
    <div className="flex h-dvh w-screen" {...props}>
      <SideMenu isMobileOpen={isMobileMenuOpen} onMobileClose={() => setIsMobileMenuOpen(false)} />
      <div className="min-w-0 flex-1">
        <button
          className="bg-card/80 fixed top-3 left-3 z-30 flex h-9 w-9 cursor-pointer items-center justify-center rounded-md border backdrop-blur-sm sm:hidden"
          onClick={() => setIsMobileMenuOpen(true)}
        >
          <Menu size={18} />
        </button>
        <div id={elementIds.scrollableContainer} className={clsx("h-dvh w-full overflow-y-auto pb-8", containerClassName)}>
          {children}
        </div>
      </div>
    </div>
  )
}
