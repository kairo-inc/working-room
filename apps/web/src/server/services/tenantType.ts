import { UserRole } from "@wr/db"

import { AppTenant } from "../../types/tenant"
import { AppTokenUsageOnTenant } from "../../types/tokenUsage"

export type TenantServiceDeleteArg = {}

export type TenantServiceTokenUsageArg = {
  startDate: Date
  endDate: Date
}

export type TenantServiceInviteArg = {
  email: string
  role: UserRole
}

export type TenantServiceInviteResult = {
  localAuthResult?: {
    email: string
    initialPassword: string
  }
}

export type TenantServiceEditArg = {
  name?: string
}

export type TenantDeleteUserArg = {
  userId: string
}

export type TenantServiceResetPasswordArg = {
  userId: string
}

export type TenantServiceResetPasswordResult = {
  localAuthResult?: {
    email: string
    newPassword: string
  }
}

export type TenantServiceChangeRoleArg = {
  userId: string
  newRole: UserRole
}

export abstract class TenantService {
  abstract tokenUsage(arg: TenantServiceTokenUsageArg): Promise<AppTokenUsageOnTenant[]>
  abstract get(): Promise<AppTenant>
  abstract edit(arg: TenantServiceEditArg): Promise<void>
  abstract invite(arg: TenantServiceInviteArg): Promise<TenantServiceInviteResult>
  abstract deleteUser(arg: TenantDeleteUserArg): Promise<void>
  abstract delete(arg: TenantServiceDeleteArg): Promise<void>

  abstract changeRole(arg: TenantServiceChangeRoleArg): Promise<void>

  abstract resetPassword(arg: TenantServiceResetPasswordArg): Promise<TenantServiceResetPasswordResult>
}
