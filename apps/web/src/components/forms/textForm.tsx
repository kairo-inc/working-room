import { VariantProps, cva } from "class-variance-authority"
import { ComponentPropsWithoutRef, forwardRef } from "react"
import { useField } from "react-final-form"

const variants = cva("border border-border rounded-md bg-input-background px-4 h-10 text-base", {
  variants: {
    variant: {
      default: "focus:ring-ring focus:outline-ring",
      error: "border-destructive focus:ring-destructive focus:outline-destructive",
      disabled: "cursor-not-allowed disabled:border-disabled-border disabled:bg-disabled disabled:text-disabled-foreground",
    },
    iconProp: {
      default: "",
      hasIcon: "pl-9",
    },
  },
})

type Variants = VariantProps<typeof variants>

export interface TextFormProps extends ComponentPropsWithoutRef<"input">, Variants {
  // This is for react-final-form to identify the form field, and it should be unique within the form.
  formName?: string
  label?: string
  icon?: React.ReactNode
  noError?: boolean
  errorText?: string
}

export const TextForm = forwardRef<HTMLInputElement, TextFormProps>((props, ref) => {
  if (props.formName) {
    return <FinalTextForm {...props} formName={props.formName} ref={ref} />
  } else {
    return <BaseTextForm {...props} ref={ref} />
  }
})

const FinalTextForm = forwardRef<HTMLInputElement, TextFormProps & { formName: string }>(
  ({ formName, disabled, onChange: _, ...props }, ref) => {
    const { input, meta } = useField(formName)
    const isDisabled = meta.submitting || disabled
    return <BaseTextForm {...input} {...props} ref={ref} disabled={isDisabled} errorText={meta.touched && meta.error} />
  }
)

const BaseTextForm = forwardRef<HTMLInputElement, TextFormProps>(
  ({ icon, className, variant = "default", label, disabled, noError, errorText, ...props }, ref) => {
    const isDisabled = disabled
    const showError = !!errorText
    const hasIcon = !!icon
    if (showError) {
      variant = "error"
    } else if (isDisabled) {
      variant = "disabled"
    }
    return (
      <div className="relative inline-flex w-full flex-col gap-1">
        {label && (
          <label htmlFor={props.id} className="text-sm">
            {label}
          </label>
        )}
        {hasIcon && <div className="text-muted-foreground absolute top-0 left-2 inline-flex h-10 items-center justify-center">{icon}</div>}
        <input
          {...props}
          id={props.id}
          className={variants({ className, variant, iconProp: hasIcon ? "hasIcon" : "default" })}
          disabled={isDisabled}
          ref={ref}
        />
        {!noError && <span className="text-destructive h-4 text-xs">{errorText}</span>}
      </div>
    )
  }
)

TextForm.displayName = "TextForm"
