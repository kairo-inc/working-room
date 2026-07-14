import { AiVendor, Prisma, Tenant } from "@prisma/client"

// EntityTenant.
export class EntityTenant implements Pick<Tenant, "id" | "name" | "aiVendor" | "allowedOauthClients"> {
  id: string
  name: string
  aiVendor: AiVendor | null
  allowedOauthClients: string

  static select = {
    id: true,
    name: true,
    aiVendor: true,
    allowedOauthClients: true,
  } as const satisfies Prisma.TenantSelect
}

export type TenantSortBy = "id" | "name"
