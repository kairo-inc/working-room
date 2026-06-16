import NextLink from "next/link"

interface LinkProps extends React.AnchorHTMLAttributes<HTMLAnchorElement> {
  href: string
}

export const Link = ({ children, href, ...props }: LinkProps) => {
  return (
    <NextLink href={href} className="text-primary hover:underline" {...props}>
      {children}
    </NextLink>
  )
}
