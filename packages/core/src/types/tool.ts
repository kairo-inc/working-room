import z from "zod"

import type { Tool } from "../tool/base"

export type ToolInputData<T extends Tool> = {
  name: T["name"]
  input: z.infer<T["inputSchema"]>
}
