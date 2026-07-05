import clsx from "clsx"
import { ReactElement, forwardRef, useEffect, useRef, useState } from "react"

import { ContainerSizeProvider } from "../../contexts/containerSize"
import { elementIds } from "../elementId"

interface BodyProps extends React.HTMLAttributes<HTMLDivElement> {
  title?: string
  description?: string | ReactElement
  tail?: ReactElement
  containerClassName?: string
}

const Title = forwardRef<HTMLDivElement, { title: string; description?: string | ReactElement; tail?: ReactElement }>(
  ({ title, description, tail }: { title: string; description?: string | ReactElement; tail?: ReactElement }, ref) => {
    return (
      <div className="mt-14 sm:mt-8" ref={ref} id={elementIds.bodyTitle}>
        <div className="flex min-h-10 items-center justify-between text-2xl font-bold">
          <h1>{title}</h1>
          {tail && <div className="shrink-0">{tail}</div>}
        </div>
        {typeof description === "string" ? <p className="text-muted-foreground mt-1 text-sm">{description}</p> : description}
      </div>
    )
  }
)

export const BodyLayout = ({
  className,
  children,
  title,
  description,
  tail,
  containerClassName: containseClassName,
  ...props
}: BodyProps) => {
  const titleRef = useRef<HTMLDivElement>(null)
  const [size, setSize] = useState({ width: 0, height: 0 })
  useEffect(() => {
    if (!titleRef.current) return
    const onResize = () => {
      if (titleRef.current) {
        const windowHeight = window.innerHeight
        const { width, height } = titleRef.current.getBoundingClientRect()
        setSize((p) => {
          if (p.width !== width || p.height !== height) {
            return { width, height: windowHeight - (height + 32) }
          }
          return p
        })
      }
    }
    onResize()
    window.addEventListener("resize", onResize)
    return () => window.removeEventListener("resize", onResize)
  }, [])

  return (
    <ContainerSizeProvider size={size}>
      <div className={clsx("mx-auto flex min-h-full max-w-4xl flex-col px-4", className)} {...props}>
        {title && <Title ref={titleRef} title={title} description={description} tail={tail} />}
        <div className={clsx("flex min-h-0 flex-1 flex-col items-start pt-8", containseClassName)}>{children}</div>
      </div>
    </ContainerSizeProvider>
  )
}

BodyLayout.displayName = "BodyLayout"
