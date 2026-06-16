import ThemedImage from "@theme/ThemedImage"
import clsx from "clsx"
import { ComponentPropsWithoutRef } from "react"

type ScreenshotProps = ComponentPropsWithoutRef<"img"> & {
  alt: string
  light: string
  dark: string
}

export default function Screenshot({ alt, light, dark, className }: ScreenshotProps) {
  return (
    <ThemedImage
      alt={alt}
      className={clsx("border-border border object-cover", className)}
      sources={{
        light,
        dark,
      }}
    />
  )
}
