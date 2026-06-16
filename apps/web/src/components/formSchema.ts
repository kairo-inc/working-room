import { z } from "zod"

import { L } from "../localization"

export const formStringRequired = () => z.string().min(1, L.common.validation.required)
export const formPasswordSchema = () => z.string().min(8, L.common.validation.passwordMinLength)
