import clsx from "clsx"
import { Forward } from "lucide-react"
import { ComponentPropsWithoutRef } from "react"
import { useFormState } from "react-final-form"

import { ChatFormInput } from "./input"

interface ChatFormProps extends ComponentPropsWithoutRef<"div"> {
  isPending?: boolean
  formName: string
  fileFormName: string
}

export const ChatForm = ({ formName, fileFormName, isPending, className, ...props }: ChatFormProps) => {
  const { values } = useFormState({ subscription: { values: true } })
  const currentValue = values[formName]
  const textValue = typeof currentValue === "string" ? currentValue : ""
  const isSubmitDisabled = Boolean(isPending || textValue.trim() === "")

  return (
    <div {...props} className={clsx("relative flex items-center gap-2", className)}>
      <ChatFormInput formName={formName} fileFormName={fileFormName} className="w-full" id="chatTextArea" />
      <button
        className="bg-primary disabled:bg-primary/50 text-primary-foreground hover:bg-primary/70 absolute right-2 bottom-2.25 flex h-10 w-10 cursor-pointer items-center justify-center rounded-md transition-colors disabled:cursor-not-allowed"
        disabled={isSubmitDisabled}
        type="submit"
      >
        <Forward />
      </button>
    </div>
  )
}
