import { IdToken } from "@wr/shared"

export type AuthSignupArg = {
  tenantName?: string
  email: string
  // Recapcha token is currently not used,
  // but we keep it for future use
  token: string
  ipAddress?: string
  acceptLanguage?: string
}

export type AuthSignupRet = {
  localAuthProps?: {
    email: string
    initialPassword: string
  }
}

export type AuthSigninWithEmailArg = {
  email: string
  password: string
}

export type AuthSigninRet = {
  idToken: string
}

export type AuthVerifyTokenArg = IdToken

export type AuthRefreshTokenArg = IdToken

export type AuthRefreshTokenRet = IdToken

export type AuthChangePasswordArg = IdToken & {
  currentPassword: string
  newPassword: string
}

export type AuthGetSettingArg = IdToken

export type AuthInitiatePasswordArg = {
  email: string
  sessionCode: string
  newPassword: string
}

export type AuthDeleteTenantArg = IdToken

export type AuthSendResetPasswordEmailArg = {
  email: string
}

export type AuthConfirmResetPasswordArg = {
  email: string
  newPassword: string
  code: string
}

export abstract class AuthService {
  abstract signup(args: AuthSignupArg): Promise<AuthSignupRet>
  abstract signinWithEmail(arg: AuthSigninWithEmailArg): Promise<AuthSigninRet>
  abstract verifyToken(arg: AuthVerifyTokenArg): Promise<void>
  abstract refreshToken(arg: AuthRefreshTokenArg): Promise<AuthRefreshTokenRet>
  abstract initiatePassword(arg: AuthInitiatePasswordArg): Promise<AuthSigninRet>
}
