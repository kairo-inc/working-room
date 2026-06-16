import React, { JSX, PropsWithoutRef, useContext } from "react"

import { AppUserSetting } from "../types/user"

export type Setting = AppUserSetting

export const SettingContext = React.createContext<{ setting?: Setting }>({})

interface Props extends PropsWithoutRef<JSX.IntrinsicElements["div"]> {
  setting: Setting
}

export const SettingProvider = ({ children, setting }: Props) => {
  return <SettingContext.Provider value={{ setting }}>{children}</SettingContext.Provider>
}

export const useSetting = () => {
  const { setting } = useContext(SettingContext)
  if (!setting) {
    throw new Error("useSetting must be used within a SettingProvider")
  }
  return setting
}

export const useIsAdminOrOwner = () => {
  const setting = useSetting()
  return setting.role === "admin" || setting.role === "owner"
}
