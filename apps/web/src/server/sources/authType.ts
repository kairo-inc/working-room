import { EntityUser, UserRole } from "@wr/db"

export type AuthSourceSignupArg = {
  tenantId: string
  userId: string
  email: string
}
export type AuthSourceSignupRet = {
  sub: string
  localAuthProps?: {
    secretHash: string
    initialPassword: string
  }
}

export type AuthSourceSigninWithEmailArg = {
  email: string
  password: string
}

export type AuthSourceSignoutArg = {
  sub: string
  userId: string
}

export type AuthSourceSigninWithEmailRet = {
  idToken: string
  refreshToken: string
}

export type AuthSourceGetUserOrNullArg = {
  email: string
}
export type AuthSourceGetUserOrNullRet = EntityUser | null

export type AuthSourceInitiatePasswordArg = {
  email: string
  sessionCode: string
  newPassword: string
}
export type AuthSourceInitiatePasswordRet = {
  idToken: string
  refreshToken: string
  localAuthProps?: {
    secretHash: string
  }
}

export type AuthSourceVerifyIdTokenArg = {
  idToken: string
}

export type AuthSourceRefreshIdTokenArg = {
  idToken: string
  refreshToken: string
}

export type AuthSourceRefreshIdTokenRet = {
  idToken: string
}

export type AuthSourceInviteArg = {
  email: string
  tenantId: string
  userId: string
  role: UserRole
}
export type AuthSourceInviteRet = {
  sub: string
  localAuthProps?: {
    secretHash: string
    initialPassword: string
  }
}

export type AuthSourceDeleteUserArg = {
  userId: string
  sub: string
}

export type AuthSourceResetPasswordArg = {
  userId: string
  sub: string
}

export type AuthSourceResetPasswordRet = {
  localAuthProps?: {
    secretHash: string
    newPassword: string
  }
}

export type AuthSourceChangeRoleArg = {
  email: string
  tenantId: string
  userId: string
  role: UserRole
}

export abstract class AuthSource {
  abstract signup(arg: AuthSourceSignupArg): Promise<AuthSourceSignupRet>
  abstract signinWithEmail(arg: AuthSourceSigninWithEmailArg): Promise<AuthSourceSigninWithEmailRet>
  abstract signout(arg: AuthSourceSignoutArg): Promise<void>
  abstract getUserOrNull(arg: AuthSourceGetUserOrNullArg): Promise<AuthSourceGetUserOrNullRet>
  abstract initiatePassword(arg: AuthSourceInitiatePasswordArg): Promise<AuthSourceInitiatePasswordRet>
  abstract verifyIdToken(arg: AuthSourceVerifyIdTokenArg): Promise<void>
  abstract refreshIdToken(arg: AuthSourceRefreshIdTokenArg): Promise<AuthSourceRefreshIdTokenRet>
  abstract invite(arg: AuthSourceInviteArg): Promise<AuthSourceInviteRet>
  abstract deleteUser(arg: AuthSourceDeleteUserArg): Promise<void>
  abstract resetPassword(arg: AuthSourceResetPasswordArg): Promise<AuthSourceResetPasswordRet>
  abstract changeRole(arg: AuthSourceChangeRoleArg): Promise<void>
}
