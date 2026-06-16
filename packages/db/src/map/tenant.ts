import { DomainTenant } from "@wr/shared"

import { EntityTenant } from "../entities/tenant"

export const mapTenantEntityToDomain = (entity: EntityTenant): DomainTenant => {
  return {
    id: entity.id,
    name: entity.name,
  }
}

export const mapTenantDomainToEntity = (domain: DomainTenant): EntityTenant => {
  return {
    id: domain.id,
    name: domain.name,
  }
}
