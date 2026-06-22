export type AppUser = {
  createdAt: Date
  id: string
  email: string
  name: string
  role: "owner" | "admin" | "member" | "guest"
}

export type AppUserSetting = {
  email: string
  id: string
  name: string
  privateDirId: string
  role: "owner" | "admin" | "member" | "guest"
}
