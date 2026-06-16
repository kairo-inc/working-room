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

  static chat(chatId?: string) {
    if (!chatId) {
      return "/chat"
    }
    return `/chat/${chatId}`
  }

  static account() {
    return "/account"
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
}
