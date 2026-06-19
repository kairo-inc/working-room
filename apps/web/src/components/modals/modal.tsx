import clsx from "clsx"
import { X } from "lucide-react"
import { Dialog } from "radix-ui"
import { ComponentPropsWithoutRef, useCallback, useRef, useState } from "react"

import { IconButton } from "../buttons/iconButton"

export type ModalBaseArgs = {
  // Hooks
  onResolve?: () => void
  onReject?: () => void
}

export type ModalProps = ComponentPropsWithoutRef<"div"> & {
  show?: boolean
  onClose?: () => void
  title?: string
  containerClassName?: string
} & ModalBaseArgs

export const Modal = ({ show, onClose, children, title, containerClassName }: ModalProps) => {
  return (
    <Dialog.Root open={show} onOpenChange={onClose}>
      <Dialog.Portal>
        <Dialog.Overlay className="modal-overlay-animation bg-popover/40 fixed inset-0" />
        <Dialog.Content
          className={clsx(
            "bg-popover-foreground modal-content-animation fixed top-1/2 left-1/2 flex max-w-1/2 min-w-100 -translate-x-1/2 -translate-y-1/2 flex-col rounded-md p-4",
            containerClassName
          )}
        >
          <div className="flex w-full items-center justify-between">
            <Dialog.Title>{title}</Dialog.Title>
            <Dialog.Close asChild>
              <IconButton icon={<X size={20} />} aria-label="Close" />
            </Dialog.Close>
          </div>
          {children}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}

export const useModal = <ModalArgs extends object>(Modal: React.ComponentType<ModalArgs>, closeDelay = 300) => {
  const [args, setArgs] = useState<ModalArgs | null>(null)
  const [show, setShow] = useState(false)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const showFn = useCallback((props: ModalArgs) => {
    if (timerRef.current) clearTimeout(timerRef.current)
    setArgs(props)
    setTimeout(() => {
      setShow(true)
    }, 50)
  }, [])

  const hideFn = useCallback(() => {
    setShow(false)
    timerRef.current = setTimeout(() => {
      setArgs(null)
      timerRef.current = null
    }, closeDelay)
  }, [closeDelay])

  return {
    show: showFn,
    modal: args ? <Modal show={show} onClose={hideFn} {...args} /> : <></>,
  }
}
