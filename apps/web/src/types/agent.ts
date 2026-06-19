import { AiModelTier, MimeType } from "@wr/shared"

export type AppAgent = {
  id: string
  name: string
  description?: string
  descriptionForAgent: string
  tier: AiModelTier
  prompt: string
  workingFolder?: {
    id: string
    name: string
    mimeType: MimeType
    parentId?: string
  }
}
