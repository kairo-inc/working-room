import { buildAuthorizationUrl, deriveCodeChallenge, generateCodeVerifier, signOAuthState } from "@wr/integration"
import { getPrivateContext, randomId } from "@wr/shared-node"

import { apiHander } from "../../../../middleware/api"
import { serverConfig } from "../../../../server/config"
import { buildCodeVerifierCookie } from "../../../../server/oauth/oauthCookie"
import { getOAuthProviderConfig } from "../../../../server/oauth/oauthProviders"
import { ensureQuery } from "../../../../utils/queryParser"

export default apiHander({
  method: "GET",
  fn: async (req, res) => {
    const provider = ensureQuery(req, "provider")
    const config = getOAuthProviderConfig(provider)
    const { userId } = getPrivateContext()

    const codeVerifier = generateCodeVerifier()
    const codeChallenge = deriveCodeChallenge(codeVerifier)
    const state = signOAuthState({ userId, provider, codeChallenge, nonce: randomId() }, serverConfig.OAUTH_STATE_SECRET)

    res.setHeader("Set-Cookie", buildCodeVerifierCookie(codeVerifier))
    res.redirect(302, buildAuthorizationUrl(config, { state, codeChallenge }))
  },
})
