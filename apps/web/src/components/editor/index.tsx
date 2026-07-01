import { EditorContent, useEditor } from "@tiptap/react"
import StarterKit from "@tiptap/starter-kit"
import { Bold, Code, Heading1, Heading2, Heading3, Italic, List, ListOrdered, Strikethrough } from "lucide-react"
import { Markdown, type MarkdownStorage } from "tiptap-markdown"

type TextEditorProps = {
  initialContent: string
  mimeType?: string
  onChange?: (content: string) => void
}

type ToolbarButtonProps = {
  onClick: () => void
  active?: boolean
  children: React.ReactNode
  title: string
}

const ToolbarButton = ({ onClick, active, children, title }: ToolbarButtonProps) => (
  <button
    type="button"
    title={title}
    onMouseDown={(e) => {
      e.preventDefault()
      onClick()
    }}
    className={`flex h-7 w-7 cursor-pointer items-center justify-center rounded text-sm transition-colors ${
      active ? "bg-primary/20 text-primary" : "text-muted-foreground hover:bg-muted hover:text-foreground"
    }`}
  >
    {children}
  </button>
)

const PlainTextEditor = ({ initialContent, onChange }: { initialContent: string; onChange?: (content: string) => void }) => (
  <textarea
    className="bg-card border-border field-sizing-content min-h-[calc(100dvh-12rem)] w-full resize-none rounded-md border p-4 font-mono text-sm leading-relaxed outline-none"
    defaultValue={initialContent}
    onChange={(e) => onChange?.(e.target.value)}
  />
)

const MarkdownEditor = ({ initialContent, onChange }: { initialContent: string; onChange?: (content: string) => void }) => {
  const editor = useEditor({
    extensions: [
      StarterKit,
      Markdown.configure({
        html: false,
        transformCopiedText: true,
        transformPastedText: true,
      }),
    ],
    content: initialContent,
    immediatelyRender: false,
    onUpdate: ({ editor }) => {
      onChange?.((editor.storage as unknown as { markdown: MarkdownStorage }).markdown.getMarkdown())
    },
  })

  if (!editor) return null

  const iconSize = 14

  return (
    <div className="border-border bg-card flex min-h-[calc(100dvh-12rem)] flex-col rounded-md border">
      <div className="border-border flex flex-wrap gap-0.5 border-b p-1">
        <ToolbarButton title="Bold" onClick={() => editor.chain().focus().toggleBold().run()} active={editor.isActive("bold")}>
          <Bold size={iconSize} />
        </ToolbarButton>
        <ToolbarButton title="Italic" onClick={() => editor.chain().focus().toggleItalic().run()} active={editor.isActive("italic")}>
          <Italic size={iconSize} />
        </ToolbarButton>
        <ToolbarButton title="Strikethrough" onClick={() => editor.chain().focus().toggleStrike().run()} active={editor.isActive("strike")}>
          <Strikethrough size={iconSize} />
        </ToolbarButton>
        <ToolbarButton title="Code" onClick={() => editor.chain().focus().toggleCode().run()} active={editor.isActive("code")}>
          <Code size={iconSize} />
        </ToolbarButton>
        <div className="bg-border mx-1 w-px self-stretch" />
        <ToolbarButton
          title="Heading 1"
          onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
          active={editor.isActive("heading", { level: 1 })}
        >
          <Heading1 size={iconSize} />
        </ToolbarButton>
        <ToolbarButton
          title="Heading 2"
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          active={editor.isActive("heading", { level: 2 })}
        >
          <Heading2 size={iconSize} />
        </ToolbarButton>
        <ToolbarButton
          title="Heading 3"
          onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
          active={editor.isActive("heading", { level: 3 })}
        >
          <Heading3 size={iconSize} />
        </ToolbarButton>
        <div className="bg-border mx-1 w-px self-stretch" />
        <ToolbarButton
          title="Bullet list"
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          active={editor.isActive("bulletList")}
        >
          <List size={iconSize} />
        </ToolbarButton>
        <ToolbarButton
          title="Ordered list"
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          active={editor.isActive("orderedList")}
        >
          <ListOrdered size={iconSize} />
        </ToolbarButton>
      </div>
      <EditorContent
        editor={editor}
        className={[
          "cursor-text p-4",
          "[&_.ProseMirror]:outline-none",
          "[&_.ProseMirror_p]:mb-4 [&_.ProseMirror_p]:text-sm",
          "[&_.ProseMirror_h1]:pt-4 [&_.ProseMirror_h1]:pb-4 [&_.ProseMirror_h1]:text-xl [&_.ProseMirror_h1]:font-bold",
          "[&_.ProseMirror_h2]:pt-4 [&_.ProseMirror_h2]:pb-4 [&_.ProseMirror_h2]:text-base [&_.ProseMirror_h2]:font-bold",
          "[&_.ProseMirror_h3]:pt-4 [&_.ProseMirror_h3]:pb-4 [&_.ProseMirror_h3]:text-base [&_.ProseMirror_h3]:font-bold",
          "[&_.ProseMirror_ul]:mb-4 [&_.ProseMirror_ul]:list-disc [&_.ProseMirror_ul]:pl-6 [&_.ProseMirror_ul]:text-sm",
          "[&_.ProseMirror_ol]:mb-4 [&_.ProseMirror_ol]:list-decimal [&_.ProseMirror_ol]:pl-6 [&_.ProseMirror_ol]:text-sm",
          "[&_.ProseMirror_li]:text-sm",
          "[&_.ProseMirror_blockquote]:border-l-2 [&_.ProseMirror_blockquote]:py-2 [&_.ProseMirror_blockquote]:pl-4 [&_.ProseMirror_blockquote]:text-sm [&_.ProseMirror_blockquote]:italic",
          "[&_.ProseMirror_hr]:my-4 [&_.ProseMirror_hr]:border-t",
          "[&_.ProseMirror_code]:bg-muted [&_.ProseMirror_code]:rounded-sm [&_.ProseMirror_code]:px-1 [&_.ProseMirror_code]:py-0.5 [&_.ProseMirror_code]:text-sm [&_.ProseMirror_code]:font-normal",
          "[&_.ProseMirror_pre]:bg-muted [&_.ProseMirror_pre]:mb-4 [&_.ProseMirror_pre]:overflow-x-auto [&_.ProseMirror_pre]:rounded-sm [&_.ProseMirror_pre]:p-4 [&_.ProseMirror_pre]:text-sm",
          "[&_.ProseMirror_pre_code]:rounded-none [&_.ProseMirror_pre_code]:bg-transparent [&_.ProseMirror_pre_code]:p-0",
          "[&_.ProseMirror_strong]:font-bold",
          "[&_.ProseMirror_em]:italic",
          "[&_.ProseMirror_s]:line-through",
          "[&_.ProseMirror_a]:text-primary [&_.ProseMirror_a]:underline",
        ].join(" ")}
      />
    </div>
  )
}

export const TextEditor = ({ initialContent, mimeType, onChange }: TextEditorProps) => {
  if (mimeType === "text/plain") {
    return <PlainTextEditor initialContent={initialContent} onChange={onChange} />
  }
  return <MarkdownEditor initialContent={initialContent} onChange={onChange} />
}
