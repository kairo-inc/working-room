import { describe, expect, it, vi } from "vitest"

import type { FileAccessService } from "@wr/access"
import { DomainFileDescriptor, DomainMessageContentToolCall } from "@wr/shared"

import { Model } from "../model"
import { ToolReadTextFile } from "./readTextFile"

vi.mock("../model", () => ({
  Model: vi.fn(),
}))

const buildToolCall = (input: unknown): DomainMessageContentToolCall => ({
  type: "tool-call",
  toolCallId: "call-1",
  toolName: "ToolReadTextFile",
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

const buildFileAccessService = (content: string, overrides?: Partial<FileAccessService>): FileAccessService =>
  ({
    getDescriptor: vi.fn().mockResolvedValue(buildDescriptor()),
    readFile: vi.fn().mockResolvedValue(new TextEncoder().encode(content).buffer),
    ...overrides,
  }) as unknown as FileAccessService

const aiVendorConfigs = { anthropic: { apiKey: "no-need-to-use-real-key", priority: 1, tierMapping: {} } } as never

describe("[Success] ToolReadTextFile", () => {
  it("Returns the full content unchanged when it is below the summarization threshold", async () => {
    const fileAccessService = buildFileAccessService("short content")
    const tool = new ToolReadTextFile(fileAccessService, aiVendorConfigs)
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
    const fileAccessService = buildFileAccessService(longContent)
    const tool = new ToolReadTextFile(fileAccessService, aiVendorConfigs)
    const toolCall = buildToolCall({ descId: "desc-1" })

    const result = await tool.run({ toolCall, config: {} } as never)

    expect(generateText).toHaveBeenCalled()
    const value = (result.message.content[0] as { output: { value: string } }).output.value
    expect(value).toContain("a short summary")
    expect(value).toContain("20001 characters")
  })

  it("Focuses the summarization prompt on the given purpose", async () => {
    const generateText = vi.fn().mockResolvedValue({ content: [{ type: "text", text: "a short summary" }], tokens: { inputTokens: 1 } })
    vi.mocked(Model).mockImplementation(function () {
      return { generateText } as never
    })
    const longContent = "x".repeat(20001)
    const fileAccessService = buildFileAccessService(longContent)
    const tool = new ToolReadTextFile(fileAccessService, aiVendorConfigs)
    const toolCall = buildToolCall({ descId: "desc-1", purpose: "find the refund policy" })

    await tool.run({ toolCall, config: {} } as never)

    const [{ messages }] = generateText.mock.calls[0]!
    expect(messages[0].content).toContain("find the refund policy")
  })

  it("Does not summarize long content when maxChars is explicitly provided", async () => {
    const generateText = vi.fn()
    vi.mocked(Model).mockImplementation(function () {
      return { generateText } as never
    })
    const longContent = "x".repeat(20001)
    const fileAccessService = buildFileAccessService(longContent)
    const tool = new ToolReadTextFile(fileAccessService, aiVendorConfigs)
    const toolCall = buildToolCall({ descId: "desc-1", maxChars: 20001 })

    const result = await tool.run({ toolCall, config: {} } as never)

    expect(generateText).not.toHaveBeenCalled()
    expect(result.message.content[0]).toMatchObject({ type: "tool-result", output: { type: "text", value: longContent } })
  })
})

describe("[Failure] ToolReadTextFile", () => {
  it("Returns an error tool-result when descId is not provided", async () => {
    const fileAccessService = buildFileAccessService("content")
    const tool = new ToolReadTextFile(fileAccessService, aiVendorConfigs)
    const toolCall = buildToolCall({})

    const result = await tool.run({ toolCall, config: {} } as never)

    expect(fileAccessService.readFile).not.toHaveBeenCalled()
    expect(result.message.content[0]).toMatchObject({ type: "tool-result", output: { type: "error-text" } })
  })

  it("Returns an error tool-result when reading the file fails", async () => {
    const fileAccessService = buildFileAccessService("content", { readFile: vi.fn().mockRejectedValue(new Error("not_found")) })
    const tool = new ToolReadTextFile(fileAccessService, aiVendorConfigs)
    const toolCall = buildToolCall({ descId: "desc-1" })

    const result = await tool.run({ toolCall, config: {} } as never)

    expect(result.message.content[0]).toMatchObject({ type: "tool-result", output: { type: "error-text" } })
  })
})
