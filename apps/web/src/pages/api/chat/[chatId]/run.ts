import z from "zod"

import { BaseError } from "@wr/shared"

import { apiHander } from "../../../../middleware/api"
import { getWebAppDiContainer } from "../../../../server/container"
import type { ChatService } from "../../../../server/services/chatType"
import { ensureQuery } from "../../../../utils/queryParser"

const schema = z.object({
  message: z.string().optional(),
  resources: z
    .object({
      descIds: z.string().array(),
    })
    .optional(),
  approvals: z
    .object({
      approvalId: z.string(),
      isApproved: z.boolean(),
    })
    .array()
    .optional(),
})

export default apiHander({
  method: "POST",
  fn: async (req, res) => {
    const body = schema.safeParse(req.body)
    if (!body.success) {
      return res.status(400).json({ error: body.error.message })
    }
    const chatId = ensureQuery(req, "chatId")
    const service = getWebAppDiContainer().resolve<ChatService>("ChatService")
    const asyncIter = await service.runSingleLoop({
      id: chatId,
      message: body.data.message,
      approvals: body.data.approvals,
      resources: body.data.resources,
    })
    res.writeHead(200, {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    })
    res.flushHeaders?.()
    try {
      for await (const chunk of asyncIter) {
        res.write(`data: ${JSON.stringify(chunk)}\n\n`)
      }
      res.write(`event: done\ndata: {}\n\n`)
    } catch (error) {
      if (error instanceof BaseError) {
        res.write(
          `event: error\ndata: ${JSON.stringify({
            message: error.message,
            errorCode: error.errorCode,
          })}\n\n`
        )
      } else {
        res.write(
          `event: error\ndata: ${JSON.stringify({
            message: "An unexpected error occurred.",
            errorCode: "UNEXPECTED_ERROR",
          })}\n\n`
        )
      }
    } finally {
      res.end()
    }
    return
  },
})
