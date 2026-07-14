export class Route {
  static home() {
    return "/"
  }

  static signin() {
    return "/signin"
  }

  static signup() {
    return "/signup"
  }

  static chat(chatId?: string, workingFolderId?: string) {
    if (!chatId) {
      if (!workingFolderId) {
        return "/chat"
      }
      return `/chat?workingFolderId=${workingFolderId}`
    }
    return `/chat/${chatId}`
  }

  static account() {
    return "/account"
  }

  static agent(id?: string) {
    if (!id) {
      return "/agent"
    }
    return `/agent/${id}`
  }

  static agentCreation() {
    return "/agent/create"
  }

  static agentEdit(id: string) {
    return `/agent/${id}/edit`
  }

  static file(descId: string, historyId?: string) {
    if (!historyId) {
      return `/file/${descId}`
    }
    return `/file/${descId}?historyId=${historyId}`
  }

  static fileContent(descId: string) {
    return `/api/file/${descId}`
  }

  static fileContentDownload(descId: string) {
    return `/api/file/${descId}?download=true`
  }

  static tree(parentId?: string) {
    if (!parentId) {
      return "/tree"
    }
    return `/tree/${parentId}`
  }

  static setting() {
    return "/setting"
  }

  static settingUserList() {
    return "/setting/user"
  }

  static settingAccessGroup(id?: string) {
    if (!id) {
      return "/setting/accessGroup"
    }
    return `/setting/accessGroup/${id}`
  }

  static settingAccessGroupEdit(id: string) {
    return `/setting/accessGroup/${id}/edit`
  }

  static oauthAuthorize(provider: string) {
    // This will redirect the user to the OAuth provider's authorization page.
    return `/api/oauth/${provider}/authorize`
  }
}
