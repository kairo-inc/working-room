import { inject, injectable } from "tsyringe"

import { OauthClientSlackSource } from "@wr/db"
import { getPrivateContext } from "@wr/shared-node"

import { mapOauthClientSlackEntityToApp } from "../../map/oauthClient"
import { OauthClientService, OauthClientServiceDisconnectArg, OauthClientServiceGetListResult } from "./oauthClientType"

@injectable()
export class OauthClientServiceImpl extends OauthClientService {
  constructor(@inject("OauthClientSlackSource") private oauthClientSlackSource: OauthClientSlackSource) {
    super()
  }

  async getList(): Promise<OauthClientServiceGetListResult> {
    const { userId } = getPrivateContext()
    const records = await this.oauthClientSlackSource.findAll("EntityOauthClientSlack", { where: { userId } })
    return records.map(mapOauthClientSlackEntityToApp)
  }

  async disconnect(args: OauthClientServiceDisconnectArg): Promise<void> {
    const { id } = args
    await this.oauthClientSlackSource.delete({ where: { id }, physically: true })
  }
}
