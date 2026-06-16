import { EditorContent, useEditor } from "@tiptap/react"
import StarterKit from "@tiptap/starter-kit"

type TextEditorProps = {
  data?: string
}

export const TextEditor = ({ data }: TextEditorProps) => {
  const editor = useEditor({
    extensions: [StarterKit],
    content: data,
    // Don't render immediately on the server to avoid SSR issues
    immediatelyRender: false,
  })

  return <EditorContent editor={editor} />
}
