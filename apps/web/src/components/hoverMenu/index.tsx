import clsx from "clsx"
import { ComponentPropsWithoutRef, useEffect, useRef, useState } from "react"

import { HoverMenuItem, HoverMenuItemData } from "./item"

type ShowArgs<Action extends string> = {
  items: HoverMenuItemData<Action>[]
  onItemClick: (action: Action) => void
  onClose?: () => void
}

type HoverMenuProps<Action extends string> = ComponentPropsWithoutRef<"div"> & {
  show?: boolean
  visible?: boolean
  items: HoverMenuItemData<Action>[]
  customRef?: React.Ref<HTMLDivElement>
  onItemClick: (action: Action) => void
}

export const HoverMenu = <Action extends string>({
  show,
  visible,
  items,
  onItemClick,
  className,
  customRef,
  ...props
}: HoverMenuProps<Action>) => {
  const showClass = show ? "block" : "hidden"
  const visibleClass = visible ? "opacity-100" : "0"
  return (
    <div
      ref={customRef}
      className={clsx(
        "bg-card border-border z-10 overflow-hidden rounded-md border opacity-0 shadow-md transition-opacity",
        showClass,
        visibleClass,
        className
      )}
      {...props}
    >
      {items.map((item, index) => (
        <HoverMenuItem key={index} data={item} onClick={() => (item.disabled ? null : onItemClick(item.action))} />
      ))}
    </div>
  )
}

export const useHoverMenu = <Action extends string>() => {
  const ref = useRef<HTMLDivElement>(null)
  const [args, setArgs] = useState<ShowArgs<Action> | null>(null)
  const [show, setShow] = useState(false)
  const [visible, setVisible] = useState(false)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    const handleOutsideClick = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        if (!show || !visible) return
        if (timerRef.current) clearTimeout(timerRef.current)
        args?.onClose?.()
        setVisible(false)
        timerRef.current = setTimeout(() => {
          setShow(false)
        }, 50)
      }
    }

    document.addEventListener("mousedown", handleOutsideClick)
    return () => {
      document.removeEventListener("mousedown", handleOutsideClick)
      if (visible && !show && timerRef.current) clearTimeout(timerRef.current)
    }
  }, [show, visible, args])

  const showFn = (e: MouseEvent, args: ShowArgs<Action>) => {
    if (timerRef.current) clearTimeout(timerRef.current)
    if (ref.current) {
      const x = e.clientX
      const y = e.clientY
      const { offsetWidth, offsetHeight } = ref.current
      const { innerWidth, innerHeight } = window
      const left = x + offsetWidth > innerWidth ? x - offsetWidth : x
      const top = y + offsetHeight > innerHeight ? y - offsetHeight : y
      ref.current.style.left = `${left}px`
      ref.current.style.top = `${top}px`
    }
    setArgs(args)
    setShow(true)
    timerRef.current = setTimeout(() => {
      setVisible(true)
    }, 50)
  }

  const HoverMenuComponent = (
    <HoverMenu
      customRef={ref}
      items={args?.items || []}
      show={show}
      visible={visible}
      onItemClick={(action) => {
        args?.onItemClick(action)
        setVisible(false)
        if (timerRef.current) clearTimeout(timerRef.current)
        timerRef.current = setTimeout(() => {
          setShow(false)
        }, 50)
      }}
      className="absolute"
    />
  )

  return { show: showFn, menu: HoverMenuComponent }
}
