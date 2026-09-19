import { L } from "../localization"

export const getFileTypeLabel = (type: string): string => {
  switch (type) {
    case "inode/directory":
      return L.file.type.folder
    case "text/markdown":
      return L.file.type.markdown
    case "text/plain":
      return L.file.type.text
    case "text/csv":
      return L.file.type.csv
    case "application/pdf":
      return L.file.type.pdf
    case "image/png":
      return L.file.type.png
    case "image/jpeg":
      return L.file.type.jpeg
    case "image/gif":
      return L.file.type.gif
    case "image/webp":
      return L.file.type.webp
    case "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
      return L.file.type.docx
    case "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet":
      return L.file.type.xlsx
    case "application/vnd.openxmlformats-officedocument.presentationml.presentation":
      return L.file.type.pptx
    case "application/octet-stream":
      return L.file.type.binary
    default:
      return type.split("/").pop() || type
  }
}
