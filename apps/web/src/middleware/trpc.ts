import { BaseError, UnknownError } from "@wr/shared"

export type ErrorMap = {
  error: new (_: string) => BaseError
  message: string
}

function extractErrorCode(e: unknown): string | undefined {
  if (e == null || typeof e !== "object") return undefined
  const obj = e as Record<string, unknown>
  if (typeof obj.errorCode === "string") return obj.errorCode
  if (obj.data != null && typeof obj.data === "object") {
    const data = obj.data as Record<string, unknown>
    if (typeof data.errorCode === "string") return data.errorCode
  }
  return undefined
}

export const handleError = (e: unknown, map: ErrorMap[], unknownString: string): never => {
  const code = extractErrorCode(e)
  for (const { error, message } of map) {
    const instance = new error(message)
    if (code === instance.errorCode) {
      throw instance
    }
  }
  throw new UnknownError(unknownString)
}
