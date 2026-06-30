import { inject, injectable } from "tsyringe"

import { AccessGroupSource, TenantSource, TokenUsageOnTenantSource, UserSource } from "@wr/db"
import { BadRequestError, PermissionDeniedError } from "@wr/shared"
import { encodeJwt, getPrivateContext, randomId, runWithPrivateContext } from "@wr/shared-node"

import { mapTenantEntityToApp } from "../../map/tenant"
import { mapTokenUsageEntityToApp } from "../../map/tokenUsage"
import { AppTenant } from "../../types/tenant"
import { AppTokenUsageOnTenant } from "../../types/tokenUsage"
import { guard } from "../guard"
import { Resolver } from "../resolver"
import { AuthSource } from "../sources/authType"
import {
  TenantDeleteUserArg,
  TenantService,
  TenantServiceChangeRoleArg,
  TenantServiceDeleteArg,
  TenantServiceEditAiVendorArg,
  TenantServiceEditArg,
  TenantServiceInviteArg,
  TenantServiceInviteResult,
  TenantServiceResetPasswordArg,
  TenantServiceResetPasswordResult,
  TenantServiceTokenUsageArg,
} from "./tenantType"

@injectable()
export class TenantServiceImpl extends TenantService {
  constructor(
    @inject("UserSource") private userSource: UserSource,
    @inject("AuthSource") private authSource: AuthSource,
    @inject("TokenUsageOnTenantSource") private tokenUsageOnTenantSource: TokenUsageOnTenantSource,
    @inject("Resolver") private resolver: Resolver,
    @inject("TenantSource") private tenantSource: TenantSource,
    @inject("AccessGroupSource") private accessGroupSource: AccessGroupSource
  ) {
    super()
  }

  async tokenUsage(arg: TenantServiceTokenUsageArg): Promise<AppTokenUsageOnTenant[]> {
    const {} = arg
    const { tenantId } = getPrivateContext()
    const token = await this.tokenUsageOnTenantSource.findMany("EntityTokenUsageOnTenant", {
      where: {
        tenantId,
      },
      sortBy: "createdAt",
      sortDirection: "desc",
      take: 200,
    })
    return token.data.map(mapTokenUsageEntityToApp)
  }

  @guard({ onlyAccept: ["owner", "admin"] })
  async get(): Promise<AppTenant> {
    const { tenantId } = getPrivateContext()
    const tenant = await this.tenantSource.find("EntityTenant", { where: { id: tenantId } })
    return mapTenantEntityToApp(tenant)
  }

  @guard({ onlyAccept: ["owner"] })
  async edit(arg: TenantServiceEditArg): Promise<void> {
    const { tenantId } = getPrivateContext()
    const { name } = arg
    await this.tenantSource.update({ where: { id: tenantId }, data: { name } })
  }

  @guard({ onlyAccept: ["owner"] })
  async editAiVendor(arg: TenantServiceEditAiVendorArg): Promise<void> {
    const { tenantId } = getPrivateContext()
    const { aiVendor } = arg
    if (aiVendor === "openai" && !process.env.OPENAI_API_KEY) {
      throw new BadRequestError("OpenAI API key is not configured")
    }
    if (aiVendor === "anthropic" && !process.env.ANTHROPIC_API_KEY) {
      throw new BadRequestError("Anthropic API key is not configured")
    }
    if (aiVendor === "google" && !process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
      throw new BadRequestError("Google Generative AI API key is not configured")
    }
    await this.tenantSource.update({ where: { id: tenantId }, data: { aiVendor } })
  }

  @guard({ onlyAccept: ["owner", "admin"] })
  async invite(arg: TenantServiceInviteArg): Promise<TenantServiceInviteResult> {
    const { email, role } = arg
    const { tenantId } = getPrivateContext()
    // Add user to this tenant.
    const userId = randomId()
    const tmpSub = randomId()
    try {
      if (role === "owner") {
        throw new BadRequestError("Can not invite user as owner")
      }

      // This method is outside of private context guard since it needs to create a temporary context for the new user invitation process.
      // The actual permission check is done in the resolver of this method.
      const tmpToken = encodeJwt({ email, userId, tenantId, role }, randomId())
      const newUserPrivateDir = await runWithPrivateContext({ idToken: tmpToken }, async () => {
        const fileService = await this.resolver.resolveFileService()
        return await fileService.ensurePrivateDir()
      })

      const name = email.split("@")[0] || "member"
      await this.userSource.create({
        data: {
          id: userId,
          sub: tmpSub,
          role,
          email,
          name,
          tenant: { connect: { id: tenantId } },
          privateDir: { connect: { id: newUserPrivateDir.id } },
          fileDescriptors: { connect: [{ id: newUserPrivateDir.id }] },
          accessGroups: {
            create: {
              name: `${name}'s personal access group`,
              description: `Personal access group for user ${name}`,
              read: true,
              write: true,
              isPersonal: true,
              tenant: { connect: { id: tenantId } },
              resources: {
                connect: [{ id: newUserPrivateDir.id }],
              },
            },
          },
        },
      })

      const { sub, localAuthProps } = await this.authSource.invite({
        email,
        tenantId,
        userId,
        role,
      })

      // Update user with the sub and secret hash generated in the auth source.
      await this.userSource.update({
        where: { id: userId },
        data: { sub, localSecretHash: localAuthProps?.secretHash },
      })

      return {
        localAuthResult: localAuthProps
          ? {
              email,
              initialPassword: localAuthProps.initialPassword,
            }
          : undefined,
      }
    } catch (e) {
      await this.userSource.delete({ where: { id: userId }, physically: true }).catch(() => {})
      throw e
    }
  }

  @guard({ onlyAccept: ["owner", "admin"] })
  async deleteUser(arg: TenantDeleteUserArg): Promise<void> {
    const { userId } = arg
    const { tenantId, userId: callerId } = getPrivateContext()
    const user = await this.userSource.find("EntityUserSecret", { where: { id: userId, tenantId } })

    // Check use can be removed from this tenant.
    if (user.role === "owner") {
      throw new PermissionDeniedError("Cannot remove owner from tenant")
    } else if (userId === callerId) {
      throw new PermissionDeniedError("Cannot remove yourself from tenant")
    }

    // Remove from auth source as well to prevent login.
    await this.authSource.deleteUser({ sub: user.sub, userId })

    // Remove user data logically.
    await this.userSource.delete({ where: { id: userId, tenantId } })
  }

  @guard({ onlyAccept: ["owner"] })
  async delete(_arg: TenantServiceDeleteArg): Promise<void> {
    const { tenantId } = getPrivateContext()
    await this.tenantSource.delete({ where: { id: tenantId } })
  }

  @guard({ onlyAccept: ["owner", "admin"] })
  async changeRole(arg: TenantServiceChangeRoleArg): Promise<void> {
    const { userId, newRole } = arg
    const { tenantId, userId: callerId } = getPrivateContext()
    const user = await this.userSource.find("EntityUserSecret", { where: { id: userId, tenantId } })

    if (user.id === callerId) {
      throw new PermissionDeniedError("Cannot change your own role")
    }

    if (user.role === "owner") {
      throw new PermissionDeniedError("Cannot change role of owner")
    }

    if (newRole === "owner") {
      throw new BadRequestError("Cannot change user role to owner")
    }

    await this.userSource.update({ where: { id: userId, tenantId }, data: { role: newRole } })
    await this.authSource.changeRole({
      userId,
      tenantId,
      email: user.email,
      role: newRole,
    })
  }

  @guard({ onlyAccept: ["owner", "admin"] })
  async resetPassword(arg: TenantServiceResetPasswordArg): Promise<TenantServiceResetPasswordResult> {
    const { userId } = arg
    const { tenantId } = getPrivateContext()
    const user = await this.userSource.find("EntityUserSecret", { where: { id: userId, tenantId } })
    const secretHash = await this.authSource.resetPassword({
      userId,
      sub: user.sub,
    })
    if (secretHash.localAuthProps) {
      await this.userSource.update({
        where: { id: userId },
        data: {
          localSecretHash: secretHash.localAuthProps.secretHash,
        },
      })
    }

    return {
      localAuthResult: secretHash.localAuthProps
        ? {
            email: user.email,
            newPassword: secretHash.localAuthProps.newPassword,
          }
        : undefined,
    }
  }
}
