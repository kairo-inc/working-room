import { AiModelName, AiVendorName } from "@wr/shared"

import { EntityTokenUsageOnTenant } from "../../../../packages/db/src/entities"
import { AppTokenUsageOnTenant } from "../types/tokenUsage"

export const mapTokenUsageEntityToApp = (entity: EntityTokenUsageOnTenant): AppTokenUsageOnTenant => {
  return {
    provider: entity.provider as AiVendorName,
    model: entity.model as AiModelName,
    cachedInputTokens: entity.cachedInputTokens,
    noCacheInputTokens: entity.noCacheInputTokens,
    inputTokens: entity.inputTokens,
    outputTokens: entity.outputTokens,
    createdAt: entity.createdAt,
  }
}
