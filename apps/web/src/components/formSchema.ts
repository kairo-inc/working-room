import { z } from "zod"

import { L } from "../localization"

export const formStringRequired = (options?: { maxLength?: number }) => {
  let schema = z.string().min(1, L.common.validation.required)
  if (options?.maxLength) {
    schema = schema.max(options.maxLength, L.common.validation.maxLength)
  }
  return schema
}
export const formPasswordSchema = () => z.string().min(8, L.common.validation.passwordMinLength).max(128, L.common.validation.maxLength)
