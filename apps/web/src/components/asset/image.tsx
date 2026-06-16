import clsx from "clsx"
import { type ComponentPropsWithoutRef } from "react"

import { Route } from "../../route"

const FALLBACK_IMAGE_SRC = "/notfound.svg"

type ImageThumbnailProps = ComponentPropsWithoutRef<"img"> & {
  descId: string
}

export const ImageThumbnail = ({ descId, className, onError, alt, ...rest }: ImageThumbnailProps) => {
  const fileUrl = Route.file(descId)
  const imageUrl = Route.fileContent(descId)

  return (
    <a href={fileUrl} target="_blank" rel="noopener noreferrer">
      <img
        src={imageUrl}
        alt={alt ?? descId}
        className={clsx("bg-card h-24 w-40 rounded border object-cover", className)}
        onError={(event) => {
          if (event.currentTarget.src.endsWith(FALLBACK_IMAGE_SRC)) {
            // Ensure we don't get into an infinite loop if the fallback image also fails to load.
            return
          }

          event.currentTarget.src = FALLBACK_IMAGE_SRC
          onError?.(event)
        }}
        {...rest}
      />
    </a>
  )
}

ImageThumbnail.displayName = "ImageThumbnail"
