// Token container.
// Access token in a integration context will be changed by the refresh token flow,
// so we need to store it in a reference container to keep it updated across the application.
export class ContextStore {
  private accessToken: string

  constructor(initialToken: string) {
    this.accessToken = initialToken
  }

  get() {
    return this.accessToken
  }

  set(token: string) {
    this.accessToken = token
  }
}
