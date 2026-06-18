import { AiModelTier } from "@wr/shared"

export type AppAgent = {
  id: string
  name: string
  description?: string
  descriptionForAgent: string
  tier: AiModelTier
  prompt: string
  workingFolderId?: string
}
