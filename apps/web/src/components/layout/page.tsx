import clsx, { ClassValue } from "clsx"
import { ComponentPropsWithoutRef } from "react"

import { SideMenu } from "../sidemenu"

export const ScrollableContainerId = "scrollable-container"

type PageLayoutProps = ComponentPropsWithoutRef<"div"> & {
  containerClassName?: ClassValue
}

export const PageLayout = ({ children, containerClassName, ...props }: PageLayoutProps) => {
  return (
    <div className="flex h-screen w-screen" {...props}>
      <SideMenu />
      <div className="w-full">
        {/* <div className="bg-card flex h-16 w-full justify-end border-b"></div> */}
        <div id={ScrollableContainerId} className={clsx("h-[calc(100vh)] w-full overflow-y-auto", "pb-8", containerClassName)}>
          {children}
        </div>
      </div>
    </div>
  )
}
