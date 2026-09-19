import { beforeEach, describe, expect, it, vi } from "vitest"

import type { FileAccessService } from "@wr/access"
import { DomainFileDescriptor, DomainMessageContentToolCall } from "@wr/shared"

import { Model } from "../model"
import { extractOfficeText } from "../office"
import { ToolReadFile } from "./readFile"

vi.mock("../model", () => ({
  Model: vi.fn(),
}))

vi.mock("../office", () => ({
  extractOfficeText: vi.fn(),
  isOfficeMimeType: (mimeType: string) =>
    [
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    ].includes(mimeType),
}))

const buildToolCall = (input: unknown): DomainMessageContentToolCall => ({
  type: "tool-call",
  toolCallId: "call-1",
  toolName: "ToolReadFile",
  input,
})

const buildDescriptor = (overrides?: Partial<DomainFileDescriptor>): DomainFileDescriptor =>
  ({
    id: "desc-1",
    birthtime: 0,
    mtime: 0,
    isFolder: false,
    isRoot: false,
    name: "file.txt",
    size: 0,
    mimeType: "text/plain",
    blobHash: "hash-1",
    pathIds: "desc-1",
    parentId: null,
    isPrivateRoot: false,
    isChatFolder: false,
    status: "exist",
    ...overrides,
  }) as DomainFileDescriptor

const buildFileAccessService = (
  content: ArrayBuffer,
  descriptorOverrides?: Partial<DomainFileDescriptor>,
  overrides?: Partial<FileAccessService>
): FileAccessService =>
  ({
    getDescriptor: vi.fn().mockResolvedValue(buildDescriptor(descriptorOverrides)),
    readFile: vi.fn().mockResolvedValue(content),
    ...overrides,
  }) as unknown as FileAccessService

const aiVendorConfigs = { anthropic: { apiKey: "no-need-to-use-real-key", priority: 1, tierMapping: {} } } as never

const encode = (text: string) => new TextEncoder().encode(text).buffer

beforeEach(() => {
  vi.clearAllMocks()
})

describe("[Success] ToolReadFile - text/*", () => {
  it("Returns the full content unchanged when it is below the summarization threshold", async () => {
    const fileAccessService = buildFileAccessService(encode("short content"))
    const tool = new ToolReadFile(fileAccessService, aiVendorConfigs)
    const toolCall = buildToolCall({ descId: "desc-1" })

    const result = await tool.run({ toolCall, config: {} } as never)

    expect(Model).not.toHaveBeenCalled()
    expect(result.message.content[0]).toMatchObject({ type: "tool-result", output: { type: "text", value: "short content" } })
  })

  it("Summarizes content that exceeds the threshold when maxChars is not provided", async () => {
    const generateText = vi.fn().mockResolvedValue({ content: [{ type: "text", text: "a short summary" }], tokens: { inputTokens: 1 } })
    vi.mocked(Model).mockImplementation(function () {
      return { generateText } as never
    })
    const longContent = "x".repeat(20001)
    const fileAccessService = buildFileAccessService(encode(longContent))
    const tool = new ToolReadFile(fileAccessService, aiVendorConfigs)
    const toolCall = buildToolCall({ descId: "desc-1" })

    const result = await tool.run({ toolCall, config: {} } as never)

    expect(generateText).toHaveBeenCalled()
    const value = (result.message.content[0] as { output: { value: string } }).output.value
    expect(value).toContain("a short summary")
    expect(value).toContain("20001 characters")
  })

  it("Does not summarize long content when maxChars is explicitly provided", async () => {
    const generateText = vi.fn()
    vi.mocked(Model).mockImplementation(function () {
      return { generateText } as never
    })
    const longContent = "x".repeat(20001)
    const fileAccessService = buildFileAccessService(encode(longContent))
    const tool = new ToolReadFile(fileAccessService, aiVendorConfigs)
    const toolCall = buildToolCall({ descId: "desc-1", maxChars: 20001 })

    const result = await tool.run({ toolCall, config: {} } as never)

    expect(generateText).not.toHaveBeenCalled()
    expect(result.message.content[0]).toMatchObject({ type: "tool-result", output: { type: "text", value: longContent } })
  })
})

describe("[Success] ToolReadFile - application/pdf", () => {
  it("Returns the full file content unchanged when it is below the summarization threshold", async () => {
    const fileAccessService = buildFileAccessService(new Uint8Array(1024).buffer, { mimeType: "application/pdf", name: "file.pdf" })
    const tool = new ToolReadFile(fileAccessService, aiVendorConfigs)
    const toolCall = buildToolCall({ descId: "desc-1" })

    const result = await tool.run({ toolCall, config: {} } as never)

    expect(Model).not.toHaveBeenCalled()
    expect(result.message.content[0]).toMatchObject({ type: "tool-result", output: { type: "file", mediaType: "application/pdf" } })
  })

  it("Summarizes the file when it exceeds the threshold", async () => {
    const generateText = vi.fn().mockResolvedValue({ content: [{ type: "text", text: "a short summary" }], tokens: { inputTokens: 1 } })
    vi.mocked(Model).mockImplementation(function () {
      return { generateText } as never
    })
    const fileAccessService = buildFileAccessService(new Uint8Array(2 * 1024 * 1024 + 1).buffer, {
      mimeType: "application/pdf",
      name: "file.pdf",
    })
    const tool = new ToolReadFile(fileAccessService, aiVendorConfigs)
    const toolCall = buildToolCall({ descId: "desc-1" })

    const result = await tool.run({ toolCall, config: {} } as never)

    expect(generateText).toHaveBeenCalled()
    const value = (result.message.content[0] as { output: { value: string } }).output.value
    expect(value).toContain("a short summary")
    expect(value).toContain("2097153 bytes")
  })
})

describe("[Success] ToolReadFile - image/*", () => {
  it("Returns the image content as base64", async () => {
    const fileAccessService = buildFileAccessService(new Uint8Array([1, 2, 3]).buffer, {
      mimeType: "image/png",
      name: "file.png",
    })
    const tool = new ToolReadFile(fileAccessService, aiVendorConfigs)
    const toolCall = buildToolCall({ descId: "desc-1" })

    const result = await tool.run({ toolCall, config: {} } as never)

    expect(Model).not.toHaveBeenCalled()
    expect(result.message.content[0]).toMatchObject({
      type: "tool-result",
      output: { type: "image", mediaType: "image/png", image: Buffer.from([1, 2, 3]).toString("base64") },
    })
  })
})

describe("[Success] ToolReadFile - Office documents", () => {
  it("Extracts and returns text content from a docx file", async () => {
    vi.mocked(extractOfficeText).mockResolvedValue("extracted docx text")
    const fileAccessService = buildFileAccessService(new Uint8Array(10).buffer, {
      mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      name: "file.docx",
    })
    const tool = new ToolReadFile(fileAccessService, aiVendorConfigs)
    const toolCall = buildToolCall({ descId: "desc-1" })

    const result = await tool.run({ toolCall, config: {} } as never)

    expect(extractOfficeText).toHaveBeenCalledWith(
      expect.anything(),
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    )
    expect(result.message.content[0]).toMatchObject({ type: "tool-result", output: { type: "text", value: "extracted docx text" } })
  })

  it("Summarizes extracted text that exceeds the threshold when maxChars is not provided", async () => {
    const generateText = vi.fn().mockResolvedValue({ content: [{ type: "text", text: "a short summary" }], tokens: { inputTokens: 1 } })
    vi.mocked(Model).mockImplementation(function () {
      return { generateText } as never
    })
    vi.mocked(extractOfficeText).mockResolvedValue("x".repeat(20001))
    const fileAccessService = buildFileAccessService(new Uint8Array(10).buffer, {
      mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      name: "file.xlsx",
    })
    const tool = new ToolReadFile(fileAccessService, aiVendorConfigs)
    const toolCall = buildToolCall({ descId: "desc-1" })

    const result = await tool.run({ toolCall, config: {} } as never)

    expect(generateText).toHaveBeenCalled()
    const value = (result.message.content[0] as { output: { value: string } }).output.value
    expect(value).toContain("a short summary")
  })

  it("Truncates extracted text to maxChars without summarizing when maxChars is provided", async () => {
    const generateText = vi.fn()
    vi.mocked(Model).mockImplementation(function () {
      return { generateText } as never
    })
    vi.mocked(extractOfficeText).mockResolvedValue("x".repeat(20001))
    const fileAccessService = buildFileAccessService(new Uint8Array(10).buffer, {
      mimeType: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
      name: "file.pptx",
    })
    const tool = new ToolReadFile(fileAccessService, aiVendorConfigs)
    const toolCall = buildToolCall({ descId: "desc-1", maxChars: 100 })

    const result = await tool.run({ toolCall, config: {} } as never)

    expect(generateText).not.toHaveBeenCalled()
    const value = (result.message.content[0] as { output: { value: string } }).output.value
    expect(value).toHaveLength(100)
  })
})

describe("[Failure] ToolReadFile", () => {
  it("Returns an error tool-result when descId is not provided", async () => {
    const fileAccessService = buildFileAccessService(encode("content"))
    const tool = new ToolReadFile(fileAccessService, aiVendorConfigs)
    const toolCall = buildToolCall({})

    const result = await tool.run({ toolCall, config: {} } as never)

    expect(fileAccessService.readFile).not.toHaveBeenCalled()
    expect(result.message.content[0]).toMatchObject({ type: "tool-result", output: { type: "error-text" } })
  })

  it("Returns an error tool-result when reading the file fails", async () => {
    const fileAccessService = buildFileAccessService(encode("content"), undefined, {
      readFile: vi.fn().mockRejectedValue(new Error("not_found")),
    })
    const tool = new ToolReadFile(fileAccessService, aiVendorConfigs)
    const toolCall = buildToolCall({ descId: "desc-1" })

    const result = await tool.run({ toolCall, config: {} } as never)

    expect(result.message.content[0]).toMatchObject({ type: "tool-result", output: { type: "error-text" } })
  })

  it("Returns an error tool-result for an unsupported MIME type", async () => {
    const fileAccessService = buildFileAccessService(encode("content"), {
      mimeType: "application/octet-stream",
      name: "file.bin",
    })
    const tool = new ToolReadFile(fileAccessService, aiVendorConfigs)
    const toolCall = buildToolCall({ descId: "desc-1" })

    const result = await tool.run({ toolCall, config: {} } as never)

    expect(result.message.content[0]).toMatchObject({ type: "tool-result", output: { type: "error-text" } })
  })
})
