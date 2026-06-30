import { AiVendor, Prisma, Tenant } from "@prisma/client"

// EntityTenant.
export class EntityTenant implements Pick<Tenant, "id" | "name" | "aiVendor"> {
  id: string
  name: string
  aiVendor: AiVendor | null

  static select = {
    id: true,
    name: true,
    aiVendor: true,
  } as const satisfies Prisma.TenantSelect
}

export type TenantSortBy = "id" | "name"
