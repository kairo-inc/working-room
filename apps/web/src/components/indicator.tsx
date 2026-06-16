import { VariantProps, cva } from "class-variance-authority"

const variants = cva("flex items-center justify-center", {
  variants: {
    size: {
      small: "*:w-2 *:h-2 gap-1",
      medium: "*:w-4 *:h-4 gap-2",
      large: "*:w-8 *:h-8 gap-2",
    },
  },
})

type FileUploadPaneProps = {
  className?: string
} & VariantProps<typeof variants>

export const LoadingIndicator = ({ size = "small", className }: FileUploadPaneProps) => {
  return (
    <div className={variants({ size, className })}>
      <div className="loading-square" />
      <div className="loading-square loading-square-delay-1" />
      <div className="loading-square loading-square-delay-2" />
    </div>
  )
}
