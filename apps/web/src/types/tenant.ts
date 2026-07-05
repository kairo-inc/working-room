import { AiVendorName } from "@wr/shared"

export type AppTenant = {
  id: string
  name: string
  aiVendor?: AiVendorName
}
