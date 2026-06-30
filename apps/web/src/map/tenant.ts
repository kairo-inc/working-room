import { EntityTenant } from "@wr/db"

import { AppTenant } from "../types/tenant"

export const mapTenantEntityToApp = (entity: EntityTenant): AppTenant => {
  return {
    id: entity.id,
    name: entity.name,
    aiVendor: entity.aiVendor ?? undefined,
  }
}
