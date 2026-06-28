import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"

const formatText = (text: string) => {
  let formattedText = text
  // Ensure that markdown syntax is properly spaced to prevent parsing issues, such as when ** is adjacent to non-space characters.
  // bold
  formattedText = formattedText.replace(/([^\s])\*\*(.*?)\*\*([^\s])/g, "$1 **$2** $3")
  // strikethrough
  formattedText = formattedText.replace(/([^\s])~~(.*?)~~([^\s])/g, "$1 ~~$2~~ $3")
  return formattedText
}

const Heading1 = ({ children, className }: React.ComponentProps<"h1">) => {
  return <h1 className={`pb-4 text-xl font-bold ${className ?? ""}`}>{children}</h1>
}
const Heading2 = ({ children, className }: React.ComponentProps<"h2">) => {
  return <h2 className={`pt-4 pb-4 text-base font-bold ${className ?? ""}`}>{children}</h2>
}
const Heading3 = ({ children, className }: React.ComponentProps<"h3">) => {
  return <h3 className={`pb-4 text-base font-bold ${className ?? ""}`}>{children}</h3>
}
const P = ({ children, className }: React.ComponentProps<"p">) => {
  return <p className={`mb-4 text-sm ${className ?? ""}`}>{children}</p>
}
const OrderedList = ({ children, className }: React.ComponentProps<"ol">) => {
  return <ol className={`mb-4 list-decimal pl-6 text-sm ${className ?? ""}`}>{children}</ol>
}
const UnorderedList = ({ children, className }: React.ComponentProps<"ul">) => {
  return <ul className={`mb-4 list-disc pl-6 text-sm ${className ?? ""}`}>{children}</ul>
}

const ListItem = ({ children, className }: React.ComponentProps<"li">) => {
  return <li className={`text-sm ${className ?? ""}`}>{children}</li>
}

const CodeBlock = ({ children, className }: React.ComponentProps<"code">) => {
  const isInline = !className?.includes("language-")
  if (isInline) {
    return <code className={`bg-muted rounded-sm px-1 py-0.5 text-sm font-normal ${className ?? ""}`}>{children}</code>
  }
  return (
    <pre className={`bg-muted mb-4 overflow-x-auto rounded-sm p-4 text-sm ${className ?? ""}`}>
      <code>{children}</code>
    </pre>
  )
}

const Hr = ({ className }: React.ComponentProps<"hr">) => {
  return <hr className={`border-t-0.5 my-4 text-sm ${className ?? ""}`} />
}

const BlockQuote = ({ children, className }: React.ComponentProps<"blockquote">) => {
  return <blockquote className={`border-l-2 py-2 pl-4 text-sm italic ${className ?? ""}`}>{children}</blockquote>
}

const Anchor = ({ children, className, href }: React.ComponentProps<"a">) => {
  return (
    <a href={href} className={`text-link hover:text-link-hover underline ${className ?? ""}`} target="_blank" rel="noopener noreferrer">
      {children}
    </a>
  )
}

const Td = ({ children, className }: React.ComponentProps<"td">) => {
  return <td className={`border px-4 py-2 text-sm whitespace-normal ${className ?? ""}`}>{children}</td>
}

export const Markdown = ({ markdown, disabled }: { markdown: string; disabled?: boolean }) => {
  return disabled ? (
    <div>{markdown}</div>
  ) : (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={{
        h1: ({ node: _, ...props }) => <Heading1 {...props} />,
        h2: ({ node: _, ...props }) => <Heading2 {...props} />,
        h3: ({ node: _, ...props }) => <Heading3 {...props} />,

        ol: ({ node: _, ...props }) => <OrderedList {...props} />,
        ul: ({ node: _, ...props }) => <UnorderedList {...props} />,
        li: ({ node: _, ...props }) => <ListItem {...props} />,
        code: ({ node: _, ...props }) => <CodeBlock {...props} className="whitespace-pre-line" />,
        p: ({ node: _, ...props }) => <P {...props} />,
        hr: ({ node: _, ...props }) => <Hr {...props} />,
        blockquote: ({ node: _, ...props }) => <BlockQuote {...props} />,
        a: ({ node: _, ...props }) => <Anchor {...props} />,
        td: ({ node: _, ...props }) => <Td {...props} />,
      }}
    >
      {formatText(markdown)}
    </ReactMarkdown>
  )
}
