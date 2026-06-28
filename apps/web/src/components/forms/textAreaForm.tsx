import { VariantProps, cva } from "class-variance-authority"
import { ComponentPropsWithoutRef, forwardRef } from "react"
import { useField } from "react-final-form"

const variants = cva(
  "rounded-md border border-border bg-input-background px-4 py-2 leading-5 text-base focus:border-transparent focus:ring-2",
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

export interface TextAreaFormProps extends ComponentPropsWithoutRef<"textarea">, Variants {
  // This is for react-final-form to identify the form field, and it should be unique within the form.
  formName?: string
  label?: string
  noError?: boolean
  errorText?: string
}

export const TextAreaForm = forwardRef<HTMLTextAreaElement, TextAreaFormProps>((props, ref) => {
  if (props.formName) {
    return <FinalTextAreaForm {...props} formName={props.formName} ref={ref} />
  } else {
    return <BaseTextAreaForm {...props} ref={ref} />
  }
})

const FinalTextAreaForm = forwardRef<HTMLTextAreaElement, TextAreaFormProps & { formName: string }>(
  ({ formName, disabled, onChange: _, ...props }, ref) => {
    const { input, meta } = useField(formName)
    const isDisabled = meta.submitting || disabled
    return <BaseTextAreaForm {...input} {...props} ref={ref} disabled={isDisabled} errorText={meta.touched && meta.error} />
  }
)

const BaseTextAreaForm = forwardRef<HTMLTextAreaElement, TextAreaFormProps>(
  ({ className, variant = "default", formName, label, disabled, noError, errorText, ...props }, ref) => {
    const isDisabled = disabled
    const showError = !!errorText

    if (showError) {
      variant = "error"
    } else if (isDisabled) {
      variant = "disabled"
    }

    return (
      <div className="relative inline-flex w-full flex-col gap-1">
        {label && (
          <label htmlFor={props.id ?? formName} className="text-sm">
            {label}
          </label>
        )}
        <textarea {...props} id={props.id ?? formName} className={variants({ className, variant })} disabled={isDisabled} ref={ref} />
        {!noError && <span className="text-destructive h-4 text-xs">{errorText}</span>}
      </div>
    )
  }
)

TextAreaForm.displayName = "TextAreaForm"
