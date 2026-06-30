import clsx, { ClassValue } from "clsx"
import { ComponentPropsWithoutRef } from "react"

import { elementIds } from "../elementId"
import { SideMenu } from "../sidemenu"

type PageLayoutProps = ComponentPropsWithoutRef<"div"> & {
  containerClassName?: ClassValue
}

export const PageLayout = ({ children, containerClassName, ...props }: PageLayoutProps) => {
  return (
    <div className="flex h-dvh w-screen" {...props}>
      <SideMenu />
      <div className="w-full">
        {/* <div className="bg-card flex h-16 w-full justify-end border-b"></div> */}
        <div id={elementIds.scrollableContainer} className={clsx("h-dvh w-full overflow-y-auto", "pb-8", containerClassName)}>
          {children}
        </div>
      </div>
    </div>
  )
}
