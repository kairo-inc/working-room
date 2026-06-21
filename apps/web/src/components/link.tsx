import clsx from "clsx"
import NextLink from "next/link"

interface LinkProps extends React.AnchorHTMLAttributes<HTMLAnchorElement> {
  href: string
}

export const Link = ({ children, href, className, ...props }: LinkProps) => {
  return (
    <NextLink href={href} className={clsx("hover:text-link-hover text-link hover:underline", className)} {...props}>
      {children}
    </NextLink>
  )
}
