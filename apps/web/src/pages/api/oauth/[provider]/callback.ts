import { OauthService, exchangeCodeForToken, verifyOAuthState } from "@wr/integration"
import { OAuthStateError } from "@wr/shared"
import { getPrivateContext } from "@wr/shared-node"

import { apiHander } from "../../../../middleware/api"
import { serverConfig } from "../../../../server/config"
import { getWebAppDiContainer } from "../../../../server/container"
import { buildClearCodeVerifierCookie, readCodeVerifierCookie } from "../../../../server/oauth/oauthCookie"
import { getOAuthProviderConfig } from "../../../../server/oauth/oauthProviders"
import { ensureQuery } from "../../../../utils/queryParser"

export default apiHander({
  method: "GET",
  fn: async (req, res) => {
    const provider = ensureQuery(req, "provider")
    const code = ensureQuery(req, "code")
    const state = ensureQuery(req, "state")
    const codeVerifier = readCodeVerifierCookie(req)
    if (!codeVerifier) {
      throw new OAuthStateError("Missing OAuth code verifier cookie.")
    }

    const decodedState = verifyOAuthState(state, serverConfig.OAUTH_STATE_SECRET)
    const { userId } = getPrivateContext()
    if (decodedState.provider !== provider || decodedState.userId !== userId) {
      throw new OAuthStateError("OAuth state does not match the current session.")
    }
    const config = getOAuthProviderConfig(provider)
    const token = await exchangeCodeForToken(config, { code, codeVerifier })

    const oauthService = getWebAppDiContainer().resolve<OauthService>("OauthService")
    await oauthService.handleOauthCallback({ provider, token, userId })

    // Clear the code verifier cookie after successful token exchange
    res.setHeader("Set-Cookie", buildClearCodeVerifierCookie())
    // Redirect to /account page.
    return res.redirect(302, "/account")
  },
})
