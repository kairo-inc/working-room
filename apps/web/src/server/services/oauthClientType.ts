import { AppOauthClient, OauthClientProvider } from "../../types/oauthClient"

export type OauthClientServiceGetListResult = AppOauthClient[]

export type OauthClientServiceDisconnectArg = {
  id: string
  provider: OauthClientProvider
}

export abstract class OauthClientService {
  abstract getList(): Promise<OauthClientServiceGetListResult>
  abstract disconnect(args: OauthClientServiceDisconnectArg): Promise<void>
}
