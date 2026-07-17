import { ContextStore } from "../oauth/store"

// Runtime context will be injected via di container.
export type IntegrationContext = {
  slack?: ContextStore

  // This is requiered to exchange the OAuth code for an access token.
  serverConfig: {
    baseUrl: string
  }
}
