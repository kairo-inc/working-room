import React, { JSX, PropsWithoutRef, useContext } from "react"

export type ContainerSizeType = { height: number; width: number }

export const ContainerSizeContext = React.createContext<ContainerSizeType>({ height: 0, width: 0 })

interface Props extends PropsWithoutRef<JSX.IntrinsicElements["div"]> {
  size: ContainerSizeType
}

export const ContainerSizeProvider = ({ children, size }: Props) => {
  return <ContainerSizeContext.Provider value={size}>{children}</ContainerSizeContext.Provider>
}

export const useContainerSize = () => {
  const containerSize = useContext(ContainerSizeContext)
  if (!containerSize) {
    throw new Error("useContainerSize must be used within a ContainerSizeProvider")
  }
  return containerSize
}
