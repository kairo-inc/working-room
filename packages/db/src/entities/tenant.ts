import { Prisma, Tenant } from "@prisma/client"

// EntityTenant.
export class EntityTenant implements Pick<Tenant, "id" | "name"> {
  id: string
  name: string

  static select = {
    id: true,
    name: true,
  } as const satisfies Prisma.TenantSelect
}

export type TenantSortBy = "id" | "name"
