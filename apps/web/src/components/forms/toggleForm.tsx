import { VariantProps, cva } from "class-variance-authority"
import clsx from "clsx"
import { ComponentPropsWithoutRef } from "react"
import { useField } from "react-final-form"

const variants = cva("h-8 w-14 outline-1 outline-border rounded-full relative inline-block cursor-pointer", {
  variants: {
    variant: {
      on: "after:absolute after:inset-0 after:rounded-full after:bg-primary after:transition-transform after:w-6 after:h-6 after:top-1 after:translate-x-7",
      off: "after:absolute after:inset-0 after:rounded-full after:bg-muted-foreground after:transition-transform after:w-6 after:h-6 after:top-1 after:translate-x-1",
      error: "!outline-destructive after:!bg-destructive",
      disabled: "after:!bg-disabled-foreground cursor-not-allowed",
    },
  },
})

type Variants = VariantProps<typeof variants>

export type ToggleFormProps = ComponentPropsWithoutRef<"input"> & {
  formName: string
}

export const ToggleForm = ({ formName, disabled, ...props }: ToggleFormProps) => {
  const { input, meta } = useField(formName)
  const isDisabled = meta.submitting || disabled
  const showError = meta.touched && meta.error

  let variantValueState: Variants["variant"] = "off"
  let variantState: Variants["variant"] = undefined

  if (input.value) {
    variantValueState = "on"
  } else {
    variantValueState = "off"
  }

  if (showError) {
    variantState = "error"
  } else if (isDisabled) {
    variantState = "disabled"
  }

  const handleOnClick = () => {
    if (!isDisabled) {
      input.onChange(!input.value)
    }
  }

  return (
    <div className="inline-flex w-full flex-col gap-1">
      <input type="checkbox" {...input} {...props} disabled={isDisabled} style={{ display: "none" }} />
      <div className={clsx(variants({ variant: variantState }), variants({ variant: variantValueState }))} onClick={handleOnClick} />
      <span className="text-destructive h-4 text-xs">{showError ? meta.error : ""}</span>
    </div>
  )
}
