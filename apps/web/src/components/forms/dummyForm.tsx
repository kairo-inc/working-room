import { VariantProps, cva } from "class-variance-authority"
import { X } from "lucide-react"
import { ComponentPropsWithoutRef, forwardRef } from "react"
import { useField } from "react-final-form"

const variants = cva(
  "flex items-center justify-between rounded-md border border-border bg-input-background h-10 leading-5 px-4 text-base focus:border-transparent focus:ring-2",
  {
    variants: {
      variant: {
        default: "focus:ring-ring focus:outline-none cursor-pointer",
        error: "border-destructive focus:ring-destructive focus:outline-none",
        placeholder: "text-muted-foreground ",
        disabled: "cursor-not-allowed disabled:border-disabled-border disabled:bg-disabled disabled:text-disabled-foreground",
      },
    },
  }
)

type Variants = VariantProps<typeof variants>

export interface DummyFormProps extends ComponentPropsWithoutRef<"div">, Variants {
  label: string
  formName: string
  disabled?: boolean
  placeholder?: string
  toString?: (value: any) => string
  onRemove?: () => void
}

export const DummyForm = forwardRef<HTMLDivElement, DummyFormProps>(
  ({ className, variant = "default", formName, label, disabled, placeholder, toString, onRemove, ...props }, ref) => {
    const {
      input: { value },
      meta,
    } = useField(formName)
    const isDisabled = meta.submitting || disabled
    const showError = meta.touched && meta.error

    if (showError) {
      variant = "error"
    } else if (isDisabled) {
      variant = "disabled"
    } else if (!value) {
      variant = "placeholder"
    }

    return (
      <div className="inline-flex w-full flex-col gap-1">
        <label htmlFor={formName} className="text-sm">
          {label}
        </label>
        <div id={formName} className={variants({ className, variant })} {...props} ref={ref} tabIndex={0}>
          {value ? (toString ? toString(value) : value) : placeholder}
          {value && onRemove && (
            <div
              onClick={(e) => {
                e.preventDefault()
                e.stopPropagation()
                onRemove()
              }}
            >
              <X size={16} className="hover:opacity-40" />
            </div>
          )}
        </div>
        <span className="text-destructive h-4 text-xs">{showError ? meta.error : ""}</span>
      </div>
    )
  }
)

DummyForm.displayName = "DummyForm"
