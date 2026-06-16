import { DomainUser } from "@wr/shared"

import { EntityUser } from "../entities/user"

export const mapUserEntityToDomain = (entity: EntityUser): DomainUser => {
  return {
    id: entity.id,
    createdAt: entity.createdAt,
    updatedAt: entity.updatedAt,
    email: entity.email,
    sub: entity.sub,
    name: entity.name,
    tenantId: entity.tenantId,
    role: entity.role,
  }
}

export const mapUserDomainToEntity = (domain: DomainUser): EntityUser => {
  return {
    id: domain.id,
    createdAt: domain.createdAt,
    updatedAt: domain.updatedAt,
    email: domain.email,
    sub: domain.sub,
    name: domain.name,
    tenantId: domain.tenantId,
    role: domain.role,
  }
}
