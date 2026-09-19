import { XMLParser } from "fast-xml-parser"
import JSZip from "jszip"
import mammoth from "mammoth"
import * as XLSX from "xlsx"

import { MimeType, supportedOfficeMimeTypes } from "@wr/shared"

export const isOfficeMimeType = (mimeType: MimeType): mimeType is (typeof supportedOfficeMimeTypes)[number] =>
  (supportedOfficeMimeTypes as readonly string[]).includes(mimeType)

export const extractOfficeText = async (content: ArrayBuffer, mimeType: MimeType): Promise<string> => {
  switch (mimeType) {
    case "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
      return extractDocxText(content)
    case "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet":
      return extractXlsxText(content)
    case "application/vnd.openxmlformats-officedocument.presentationml.presentation":
      return extractPptxText(content)
    default:
      throw new Error(`Unsupported office MIME type: ${mimeType}`)
  }
}

const extractDocxText = async (content: ArrayBuffer): Promise<string> => {
  const result = await mammoth.extractRawText({ buffer: Buffer.from(content) })
  return result.value
}

const extractXlsxText = async (content: ArrayBuffer): Promise<string> => {
  const workbook = XLSX.read(Buffer.from(content), { type: "buffer" })
  return workbook.SheetNames.map((sheetName) => {
    const sheet = workbook.Sheets[sheetName]
    const csv = sheet ? XLSX.utils.sheet_to_csv(sheet) : ""
    return `# Sheet: ${sheetName}\n${csv}`
  }).join("\n\n")
}

// Matches "ppt/slides/slide1.xml", capturing the slide number so slides can be read back in order.
const SLIDE_FILE_PATTERN = /^ppt\/slides\/slide(\d+)\.xml$/

const extractPptxText = async (content: ArrayBuffer): Promise<string> => {
  const zip = await JSZip.loadAsync(content)
  const slideFiles = Object.keys(zip.files)
    .map((name) => ({ name, match: name.match(SLIDE_FILE_PATTERN) }))
    .filter((entry): entry is { name: string; match: RegExpMatchArray } => entry.match !== null)
    .sort((a, b) => Number(a.match[1]) - Number(b.match[1]))

  const parser = new XMLParser({ ignoreAttributes: true, textNodeName: "#text" })
  const slideTexts = await Promise.all(
    slideFiles.map(async ({ name }) => {
      const xml = await zip.file(name)?.async("text")
      return xml ? extractTextRuns(parser.parse(xml)).join("\n") : ""
    })
  )
  return slideTexts.map((text, i) => `# Slide ${i + 1}\n${text}`).join("\n\n")
}

// PowerPoint slide XML represents each run of text as an <a:t> element, nested arbitrarily deep inside
// shapes, groups, and tables. Walk the parsed tree and collect every <a:t> value in document order.
const extractTextRuns = (node: unknown, acc: string[] = []): string[] => {
  if (Array.isArray(node)) {
    for (const item of node) extractTextRuns(item, acc)
  } else if (node && typeof node === "object") {
    for (const [key, value] of Object.entries(node as Record<string, unknown>)) {
      if (key === "a:t") {
        if (typeof value === "string") {
          acc.push(value)
        } else if (value && typeof value === "object" && "#text" in (value as Record<string, unknown>)) {
          acc.push(String((value as Record<string, unknown>)["#text"]))
        }
      } else {
        extractTextRuns(value, acc)
      }
    }
  }
  return acc
}
