import { EntityUser } from "@wr/db"

type UserInitialData = Pick<EntityUser, "id" | "email" | "role">

export const testUserOwner: UserInitialData = {
  id: "test-user-id",
  email: "test-user@workingroom.io",
  role: "owner",
}

export const testUserMemberOther: UserInitialData = {
  id: "test-other-user-id",
  email: "test-other-user@workingroom.io",
  role: "member",
}
