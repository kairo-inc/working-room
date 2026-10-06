export type AppMcpServer = {
  id: string
  name: string
  url: string
  // The access token itself is never sent to the browser.
  hasAccessToken: boolean
  enabled: boolean
  toolNames: string[]
  toolsFetchedAt?: Date
}
