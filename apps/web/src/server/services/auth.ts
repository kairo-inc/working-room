import { inject, injectable } from "tsyringe"

import { AccessGroupSource, TenantSource, UserSource } from "@wr/db"
import { AlreadyExistsError, AuthenticationError, PasswordInitializationRequired, isErrorEqual } from "@wr/shared"
import { decodeJwt, encodeJwt, randomId, runWithPrivateContext } from "@wr/shared-node"

import { serverConfig } from "../config"
import { Resolver } from "../resolver"
import { AuthSource } from "../sources/authType"
import {
  AuthInitiatePasswordArg,
  AuthRefreshTokenArg,
  AuthRefreshTokenRet,
  AuthService,
  AuthSigninRet,
  AuthSigninWithEmailArg,
  AuthSignupArg,
  AuthSignupRet,
  AuthVerifyTokenArg,
} from "./authType"

const INTENTIONAL_DELAY_MS = 1000

@injectable()
export class AuthServiceImpl extends AuthService {
  constructor(
    @inject("TenantSource") private tenantSource: TenantSource,
    @inject("UserSource") private userSource: UserSource,
    @inject("AuthSource") private authSource: AuthSource,
    @inject("Resolver") private resolver: Resolver,
    @inject("AccessGroupSource") private accessGroupSource: AccessGroupSource
  ) {
    super()
  }

  // This is owner signup.
  async signup(args: AuthSignupArg): Promise<AuthSignupRet> {
    const { email } = args
    const tenantId = randomId()
    const userId = randomId()
    const tmpSub = randomId()
    const name = email.split("@")[0]!

    // We intentionally delay the response to mitigate brute-force attack, even if the signup process fails.
    const sleep = new Promise((resolve) => setTimeout(resolve, INTENTIONAL_DELAY_MS))
    try {
      // NOTE: Currently we allow only one user per email across database, even if the tenant is different.
      const existingUser = await this.userSource.findIfExists("EntityUser", {
        where: { email, deletedAt: null },
      })
      if (existingUser) {
        throw new AlreadyExistsError("User with this email already exists")
      }

      const tenantExists = await this.tenantSource.exists({ where: { deletedAt: null } })
      if (tenantExists && !serverConfig.MULTI_TENANT) {
        throw new AlreadyExistsError("Signup is disabled because a tenant already exists")
      }

      // Create a tenant.
      await this.tenantSource.create({
        data: {
          id: tenantId,
          name: args.tenantName || `${name}'s tenant`,
        },
      })

      // Execute folder creation as a temporary user.
      const tmpJwt = encodeJwt({ email, userId, tenantId, role: "owner" }, randomId())
      const [rootDir, _, privateDir] = await runWithPrivateContext({ idToken: tmpJwt }, async () => {
        const fileService = await this.resolver.resolveFileService()
        const rootDir = await fileService.ensureRootDir()
        const shared = await fileService.ensureSharedRootDir()
        const privateDir = await fileService.ensurePrivateDir()
        return [rootDir, shared, privateDir]
      })

      await this.userSource.create({
        data: {
          id: userId,
          sub: tmpSub,
          name,
          email,
          tenant: { connect: { id: tenantId } },
          // All user created via this method will be an owner of the tenant.
          // Other members in the same tenant will be invited by the owner after the signup.
          role: "owner",
          accessGroups: {
            create: [
              {
                name: `Owner access group`,
                description: `Access group for tenant owners`,
                read: true,
                write: true,
                isOwner: true,
                tenant: { connect: { id: tenantId } },
                resources: {
                  connect: { id: rootDir.id },
                },
              },
              {
                name: `${name}'s personal access group`,
                description: `Personal access group for user ${name}`,
                read: true,
                write: true,
                isPersonal: true,
                tenant: { connect: { id: tenantId } },
                resources: {
                  connect: { id: privateDir.id },
                },
              },
            ],
          },
          privateDir: { connect: { id: privateDir.id } },
          // Connect to the owner column.
          fileDescriptors: { connect: [{ id: privateDir.id }] },
        },
      })
      const { sub, localAuthProps } = await this.authSource.signup({
        email,
        tenantId,
        userId,
      })

      await this.userSource.update({
        where: { id: userId },
        data: { sub, localSecretHash: localAuthProps?.secretHash },
      })

      if (localAuthProps) {
        const messsage = `A user signed up with email ${email} and initial password ${localAuthProps.initialPassword}`
        console.info(`[AuthServiceImpl][signup] ${messsage}`)
      }

      // This will allow client to download the initial password if local auth is used.
      // We need to return the initial password only at the time of signup, and not return it in other APIs (e.g. signin, initiatePassword) for security reasons.
      return {
        localAuthProps: localAuthProps
          ? {
              email,
              initialPassword: localAuthProps.initialPassword,
            }
          : undefined,
      }
    } catch (e) {
      // This will remove cascadingly created tenant, user and private directory.
      // We don't need to separately delete the user and private directory because of the cascade delete relation in the database.
      await this.tenantSource.delete({ where: { id: tenantId }, physically: true }).catch(() => {})
      throw e
    } finally {
      await sleep
    }
  }

  async signinWithEmail(arg: AuthSigninWithEmailArg): Promise<AuthSigninRet> {
    const { email, password } = arg

    // NOTE: We intentionally delay the response to mitigate brute-force attack.
    const sleep = new Promise((resolve) => setTimeout(resolve, INTENTIONAL_DELAY_MS))
    try {
      const { idToken, refreshToken } = await this.authSource.signinWithEmail({
        email,
        password,
      })
      await this.userSource.update({
        where: { email },
        data: { refreshToken },
      })
      return { idToken }
    } catch (e) {
      if (isErrorEqual(e, PasswordInitializationRequired)) {
        throw e
      }
      throw new AuthenticationError("Invalid password or user not found")
    } finally {
      await sleep
    }
  }

  async verifyToken(arg: AuthVerifyTokenArg): Promise<void> {
    const { idToken } = arg
    await this.authSource.verifyIdToken({ idToken })
  }

  async refreshToken(arg: AuthRefreshTokenArg): Promise<AuthRefreshTokenRet> {
    const { idToken } = arg
    const { userId } = decodeJwt(idToken)
    const user = await this.userSource.findIfExists("EntityUserSecret", {
      where: { id: userId },
    })
    const refreshToken = user?.refreshToken
    if (!refreshToken) {
      throw new AuthenticationError("Invalid refresh token")
    }

    const { idToken: newIdToken } = await this.authSource.refreshIdToken({ idToken, refreshToken })
    return { idToken: newIdToken }
  }

  async initiatePassword(arg: AuthInitiatePasswordArg): Promise<AuthSigninRet> {
    const { email, sessionCode, newPassword } = arg
    const { idToken, refreshToken, localAuthProps } = await this.authSource.initiatePassword({
      email,
      sessionCode,
      newPassword,
    })
    await this.userSource.update({
      where: { email },
      data: { localSecretHash: localAuthProps?.secretHash, refreshToken },
    })
    return { idToken }
  }
}
