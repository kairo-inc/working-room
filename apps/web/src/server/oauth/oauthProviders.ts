import { OAuth2ProviderConfig, getSlackOAuthConfig } from "@wr/integration"
import { NotFoundError } from "@wr/shared"

const callbackUrl = (provider: string): string => {
  const baseUrl = process.env.HOST ?? "http://localhost:3000"
  // NOTE:
  // Need to register the callback URL in the OAuth provider's app settings.
  // For example, for Slack, you need to register the callback URL in your Slack app settings.
  // The callback URL should be in the format of `${baseUrl}/api/oauth/${provider}/callback`.
  return `${baseUrl}/api/oauth/${provider}/callback`
}

const OAUTH_PROVIDER_CONFIGS: Record<string, () => OAuth2ProviderConfig> = {
  slack: () => getSlackOAuthConfig(callbackUrl("slack")),
}

export const getOAuthProviderConfig = (provider: string): OAuth2ProviderConfig => {
  const getConfig = OAUTH_PROVIDER_CONFIGS[provider]
  if (!getConfig) {
    throw new NotFoundError(`Unknown OAuth provider: '${provider}'.`)
  }
  return getConfig()
}
