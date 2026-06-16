import { ModelMessage } from "ai"
import { describe, expect, it } from "vitest"

import { DomainMessageWithoutId, InvalidAiConfigError, anthropicDefaultTierMapping, openAiDefaultTierMapping } from "@wr/shared"

import { Model } from "./model"

describe("[Success] Model", () => {
  it("Properly transform message content", async () => {
    const model = new Model({
      modelTier: "medium",
      vendorConfigs: {
        openai: { apiKey: "no-need-to-use-real-key", priority: 1, tierMapping: { ...openAiDefaultTierMapping } },
      },
    })
    const inputMessages: DomainMessageWithoutId[] = [
      // Role: system
      { role: "system", content: "system prompt" },
      // Role: user
      { role: "user", content: [{ type: "text", text: "hello" }] },
      { role: "user", content: [{ type: "file-ref", blobHash: "none", descId: "none", mimeType: "any" }] },
      { role: "user", content: [{ type: "image", descId: "none", image: "base64-image", mediaType: "image/any" }] },
      { role: "user", content: [{ type: "file", descId: "none", data: "base64-file", mediaType: "application/any" }] },
      { role: "user", content: [{ type: "text-file", descId: "none", data: "text", mediaType: "text/any" }] },
      // Role: assistant
      { role: "assistant", content: [{ type: "text", text: "hello" }] },
      { role: "assistant", content: [{ type: "tool-call", toolCallId: "none", toolName: "none", input: "hello" }] },
      { role: "assistant", content: [{ type: "proceeded-file", blobHash: "none", descId: "none", mimeType: "any" }] },
      // Role: tool
      { role: "tool", content: [{ type: "tool-result", toolCallId: "none", toolName: "none", output: { type: "text", value: "hello" } }] },
      {
        role: "tool",
        content: [
          {
            type: "tool-result",
            toolCallId: "none",
            toolName: "none",
            output: { type: "image", descId: "none", image: "base64-image", mediaType: "image/any" },
          },
        ],
      },
      {
        role: "tool",
        content: [
          {
            type: "tool-result",
            toolCallId: "none",
            toolName: "none",
            output: { type: "file", descId: "none", data: "base64-file", mediaType: "application/any" },
          },
        ],
      },
      {
        role: "tool",
        content: [
          {
            type: "tool-result",
            toolCallId: "none",
            toolName: "none",
            output: { type: "file-ref", blobHash: "none", descId: "none", mimeType: "any" },
          },
        ],
      },
      { role: "tool", content: [{ type: "proceeded-file", blobHash: "none", descId: "none", mimeType: "any" }] },
    ]
    const outputMessages: ModelMessage[] = [
      // Role: system
      { role: "system", content: "system prompt" },
      // Role: user
      { role: "user", content: [{ type: "text", text: "hello" }] },
      { role: "user", content: [] },
      { role: "user", content: [{ type: "image", image: "base64-image", mediaType: "image/any" }] },
      { role: "user", content: [{ type: "file", data: "base64-file", mediaType: "application/any" }] },
      { role: "user", content: [{ type: "text", text: "text" }] },
      // Role: assistant
      { role: "assistant", content: [{ type: "text", text: "hello" }] },
      { role: "assistant", content: [{ type: "tool-call", toolCallId: "none", toolName: "none", input: "hello" }] },
      { role: "assistant", content: [] },
      // Role: tool
      { role: "tool", content: [{ type: "tool-result", toolCallId: "none", toolName: "none", output: { type: "text", value: "hello" } }] },
      {
        role: "tool",
        content: [
          {
            type: "tool-result",
            toolCallId: "none",
            toolName: "none",
            output: { type: "content", value: [{ type: "image-data", data: "base64-image", mediaType: "image/any" }] },
          },
        ],
      },
      {
        role: "tool",
        content: [
          {
            type: "tool-result",
            toolCallId: "none",
            toolName: "none",
            output: { type: "content", value: [{ type: "file-data", data: "base64-file", mediaType: "application/any" }] },
          },
        ],
      },
      { role: "tool", content: [] },
      { role: "tool", content: [] },
    ]

    const messageContexts = await model.buildContext(inputMessages)

    expect(messageContexts).toEqual(outputMessages)
  })

  it("Openai config will be selected", async () => {
    const model = new Model({
      modelTier: "medium",
      vendorConfigs: {
        openai: { apiKey: "no-need-to-use-real-key", priority: 1, tierMapping: { ...openAiDefaultTierMapping } },
        anthropic: { apiKey: "no-need-to-use-real-key", priority: 2, tierMapping: { ...anthropicDefaultTierMapping } },
      },
    })
    expect(model.getVendorName()).toBe("openai")
  })

  it("Anthropic config will be selected", async () => {
    const model = new Model({
      modelTier: "medium",
      vendorConfigs: {
        openai: { apiKey: "no-need-to-use-real-key", priority: 2, tierMapping: { ...openAiDefaultTierMapping } },
        anthropic: { apiKey: "no-need-to-use-real-key", priority: 1, tierMapping: { ...anthropicDefaultTierMapping } },
      },
    })
    expect(model.getVendorName()).toBe("anthropic")
  })
})

describe("[Failure] Model", () => {
  it("Fail to instantiate Model with no vendor configs", async () => {
    try {
      const model = new Model({
        modelTier: "medium",
        vendorConfigs: {},
      })
      expect(model).toBeUndefined() // This line should not be reached
    } catch (error) {
      expect(error).toBeInstanceOf(InvalidAiConfigError)
    }
  })
})
