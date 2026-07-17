// Token container.
// Access token in a integration context will be changed by the refresh token flow,
// so we need to store it in a reference container to keep it updated across the application.
export class ContextStore {
  // id: OauthClient record's id in the database.
  private id: string
  private accessToken: string

  constructor(id: string, initialToken: string) {
    this.id = id
    this.accessToken = initialToken
  }

  get() {
    return {
      id: this.id,
      accessToken: this.accessToken,
    }
  }

  setAccessToken(token: string) {
    this.accessToken = token
  }
}
