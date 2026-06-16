import { apiHander } from "../../../../middleware/api"
import { getWebAppDiContainer } from "../../../../server/container"
import { Resolver } from "../../../../server/resolver"
import { ensureQuery } from "../../../../utils/queryParser"

// MIME types that browsers can execute as scripts or render as HTML.
// Serving these inline with user-controlled content enables stored XSS.
const SCRIPT_EXECUTABLE_MIME_RE = /^(text\/html|text\/javascript|application\/(javascript|xhtml\+xml)|image\/svg\+xml)/i

function sanitizeMimeType(mimeType: string): string {
  const base = (mimeType.split(";")[0] ?? mimeType).trim()
  return SCRIPT_EXECUTABLE_MIME_RE.test(base) ? "application/octet-stream" : mimeType
}

export default apiHander({
  method: "GET",
  fn: async (req, res) => {
    const descId = ensureQuery(req, "descId")
    const service = await getWebAppDiContainer().resolve<Resolver>("Resolver").resolveFileService()
    const fileDescriptor = await service.get({ id: descId })
    const stream = await service.getBinaryFileContentStream({ id: fileDescriptor.id })
    res.setHeader("Content-Disposition", `inline; filename=*=UTF-8''${encodeURIComponent(fileDescriptor.name)}`)
    res.setHeader("Content-Type", sanitizeMimeType(fileDescriptor.mimeType))
    stream.pipe(res)
    stream.on("end", () => {
      res.status(200).end()
    })
    stream.on("error", (err) => {
      if (!res.headersSent) {
        res.status(500).end()
      } else {
        res.destroy(err)
      }
    })
    return
  },
})
