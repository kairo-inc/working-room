import clsx from "clsx"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { useRouter } from "next/router"
import { ComponentPropsWithoutRef } from "react"

import { PageResult } from "@wr/shared"

const Button = ({
  children,
  disabled,
  isCurrent,
  ...props
}: ComponentPropsWithoutRef<"a"> & { disabled?: boolean; isCurrent?: boolean }) => {
  return (
    <a
      className={clsx(
        "flex items-center gap-1 rounded px-2 py-1",
        disabled ? "pointer-events-none opacity-50" : "hover:bg-muted",
        isCurrent ? "bg-muted pointer-events-none" : ""
      )}
      {...props}
    >
      {children}
    </a>
  )
}

type PagerProps = ComponentPropsWithoutRef<"div"> & Omit<PageResult<any>, "data">

// Index starts with 0.
export const Pager = ({ nextPage, maxPage, className, ...props }: PagerProps) => {
  const { pathname, query } = useRouter()

  const current = query.page ? parseInt(query.page as string, 10) : 0
  const hasNext = nextPage !== undefined && current < maxPage - 1
  const hasPrev = current > 0

  const buildUrl = (index?: number) => {
    const q = { ...query, page: index === 0 ? undefined : index?.toString() }
    const filteredQuery = Object.fromEntries(Object.entries(q).filter(([_, value]) => value !== undefined))
    if (Object.keys(filteredQuery).length === 0) {
      return pathname
    }
    const queryString = new URLSearchParams(filteredQuery as Record<string, string>).toString()
    return `${pathname}?${queryString}`
  }

  const nextUrl = buildUrl(hasNext ? current + 1 : undefined)
  const prevUrl = buildUrl(hasPrev ? current - 1 : undefined)

  const numbers = Array.from({ length: Math.max(maxPage, 1) }, (_, i) => i + 1)

  return (
    <div className={clsx(className, "flex items-center gap-2 text-sm")} {...props}>
      <Button href={prevUrl} disabled={!hasPrev}>
        <ChevronLeft size={24} />
      </Button>
      {numbers.map((num) => (
        <Button key={num} href={buildUrl(num - 1)} isCurrent={num === current + 1}>
          {num}
        </Button>
      ))}
      <Button href={nextUrl} disabled={!hasNext}>
        <ChevronRight size={24} />
      </Button>
    </div>
  )
}
