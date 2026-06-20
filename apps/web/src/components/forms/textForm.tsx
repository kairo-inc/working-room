import { VariantProps, cva } from "class-variance-authority"
import { ComponentPropsWithoutRef, forwardRef } from "react"
import { useField } from "react-final-form"

const variants = cva(
  "rounded-md border border-border bg-input-background px-4 h-10 leading-5 text-base focus:border-transparent focus:ring-2",
  {
    variants: {
      variant: {
        default: "focus:ring-ring focus:outline-none",
        error: "border-destructive focus:ring-destructive focus:outline-none",
        disabled: "cursor-not-allowed disabled:border-disabled-border disabled:bg-disabled disabled:text-disabled-foreground",
      },
    },
  }
)

type Variants = VariantProps<typeof variants>

export interface TextFormProps extends ComponentPropsWithoutRef<"input">, Variants {
  // This is for react-final-form to identify the form field, and it should be unique within the form.
  label: string
  formName: string
}

export const TextForm = forwardRef<HTMLInputElement, TextFormProps>(
  ({ className, variant = "default", formName, label, disabled, onChange, ...props }, ref) => {
    const { input, meta } = useField(formName)
    const isDisabled = meta.submitting || disabled
    const showError = meta.touched && meta.error

    if (showError) {
      variant = "error"
    } else if (isDisabled) {
      variant = "disabled"
    }
    return (
      <div className="inline-flex w-full flex-col gap-1">
        <label htmlFor={formName} className="text-sm">
          {label}
        </label>
        <input
          id={formName}
          className={variants({ className, variant })}
          {...input}
          {...props}
          disabled={isDisabled}
          ref={ref}
          onChange={(e) => {
            input.onChange(e)
            onChange?.(e)
          }}
        />
        <span className="text-destructive h-4 text-xs">{showError ? meta.error : ""}</span>
      </div>
    )
  }
)

TextForm.displayName = "TextForm"
