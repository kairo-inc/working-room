import JSZip from "jszip"
import { describe, expect, it } from "vitest"
import * as XLSX from "xlsx"

import { extractOfficeText, isOfficeMimeType } from "./extractOfficeText"

const DOCX_MIME = "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
const XLSX_MIME = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
const PPTX_MIME = "application/vnd.openxmlformats-officedocument.presentationml.presentation"

const toArrayBuffer = (buffer: Buffer): ArrayBuffer => {
  const arrayBuffer = new ArrayBuffer(buffer.byteLength)
  new Uint8Array(arrayBuffer).set(buffer)
  return arrayBuffer
}

const buildDocx = async (paragraphs: string[]): Promise<ArrayBuffer> => {
  const zip = new JSZip()
  zip.file(
    "[Content_Types].xml",
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
</Types>`
  )
  zip.file(
    "_rels/.rels",
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>`
  )
  const body = paragraphs.map((text) => `<w:p><w:r><w:t>${text}</w:t></w:r></w:p>`).join("")
  zip.file(
    "word/document.xml",
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>${body}</w:body>
</w:document>`
  )
  const buffer = await zip.generateAsync({ type: "nodebuffer" })
  return toArrayBuffer(buffer)
}

const buildXlsx = (sheets: Record<string, unknown[][]>): ArrayBuffer => {
  const workbook = XLSX.utils.book_new()
  for (const [name, rows] of Object.entries(sheets)) {
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet(rows), name)
  }
  const buffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" }) as Buffer
  return toArrayBuffer(buffer)
}

const buildPptx = async (slideTexts: string[][]): Promise<ArrayBuffer> => {
  const zip = new JSZip()
  slideTexts.forEach((runs, i) => {
    const paragraphs = runs.map((text) => `<a:p><a:r><a:t>${text}</a:t></a:r></a:p>`).join("")
    zip.file(
      `ppt/slides/slide${i + 1}.xml`,
      `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<p:sld xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main">
  <p:cSld><p:spTree><p:sp><p:txBody>${paragraphs}</p:txBody></p:sp></p:spTree></p:cSld>
</p:sld>`
    )
  })
  const buffer = await zip.generateAsync({ type: "nodebuffer" })
  return toArrayBuffer(buffer)
}

describe("isOfficeMimeType", () => {
  it("Returns true for docx, xlsx, and pptx MIME types", () => {
    expect(isOfficeMimeType(DOCX_MIME)).toBe(true)
    expect(isOfficeMimeType(XLSX_MIME)).toBe(true)
    expect(isOfficeMimeType(PPTX_MIME)).toBe(true)
  })

  it("Returns false for other MIME types", () => {
    expect(isOfficeMimeType("application/pdf")).toBe(false)
    expect(isOfficeMimeType("text/plain")).toBe(false)
  })
})

describe("extractOfficeText", () => {
  it("Extracts paragraph text from a docx file", async () => {
    const content = await buildDocx(["Hello from docx", "Second paragraph"])

    const text = await extractOfficeText(content, DOCX_MIME)

    expect(text).toContain("Hello from docx")
    expect(text).toContain("Second paragraph")
  })

  it("Extracts cell values from every sheet in an xlsx file as CSV", async () => {
    const content = buildXlsx({
      People: [
        ["Name", "Age"],
        ["Alice", 30],
      ],
      Notes: [["hello"]],
    })

    const text = await extractOfficeText(content, XLSX_MIME)

    expect(text).toContain("# Sheet: People")
    expect(text).toContain("Name,Age")
    expect(text).toContain("Alice,30")
    expect(text).toContain("# Sheet: Notes")
    expect(text).toContain("hello")
  })

  it("Extracts slide text from a pptx file in slide order", async () => {
    const content = await buildPptx([["Slide One Title", "Body text"], ["Slide Two"]])

    const text = await extractOfficeText(content, PPTX_MIME)

    expect(text.indexOf("Slide One Title")).toBeLessThan(text.indexOf("Slide Two"))
    expect(text).toContain("Body text")
  })

  it("Reads pptx slides in numeric order even when slide10 sorts before slide2 lexically", async () => {
    const content = await buildPptx([
      ["first"],
      ["second"],
      ["third"],
      ["fourth"],
      ["fifth"],
      ["sixth"],
      ["seventh"],
      ["eighth"],
      ["ninth"],
      ["tenth"],
    ])

    const text = await extractOfficeText(content, PPTX_MIME)

    expect(text.indexOf("second")).toBeLessThan(text.indexOf("tenth"))
  })

  it("Throws for an unsupported MIME type", async () => {
    await expect(extractOfficeText(new ArrayBuffer(0), "application/pdf")).rejects.toThrow(/Unsupported office MIME type/)
  })
})
