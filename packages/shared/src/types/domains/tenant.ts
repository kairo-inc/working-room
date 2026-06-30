import { AiVendorName } from "../ais/vendor"

export type DomainTenant = {
  id: string
  name: string
  aiVendor: AiVendorName | null
}
