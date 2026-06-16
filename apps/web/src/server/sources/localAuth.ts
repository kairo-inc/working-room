import cuid from "cuid"
import { inject, injectable } from "tsyringe"

import { LocalSessionSource, UserSource } from "@wr/db"
import { AlreadyExistsError, AuthenticationError, NotFoundError, PasswordInitializationRequired } from "@wr/shared"
import { decodeJwt, encodeJwt, makePasswordHash, randomId, verifyPassword } from "@wr/shared-node"

import { serverConfig } from "../../server/config"
import {
  AuthSource,
  AuthSourceChangeRoleArg,
  AuthSourceDeleteUserArg,
  AuthSourceGetUserOrNullArg,
  AuthSourceGetUserOrNullRet,
  AuthSourceInitiatePasswordArg,
  AuthSourceInitiatePasswordRet,
  AuthSourceInviteArg,
  AuthSourceInviteRet,
  AuthSourceRefreshIdTokenArg,
  AuthSourceRefreshIdTokenRet,
  AuthSourceResetPasswordArg,
  AuthSourceResetPasswordRet,
  AuthSourceSigninWithEmailArg,
  AuthSourceSigninWithEmailRet,
  AuthSourceSignupArg,
  AuthSourceSignupRet,
  AuthSourceVerifyIdTokenArg,
} from "./authType"

const randomSecret = () => {
  const array = new Uint8Array(16)
  crypto.getRandomValues(array)
  return Array.from(array)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("")
}

const getExpiresAt = () => {
  return new Date(Date.now() + 1000 * 60 * 60 * 24 * 7)
}

@injectable()
export class LocalAuthSourceImpl extends AuthSource {
  constructor(
    @inject("LocalSessionSource") private localSessionSource: LocalSessionSource,
    @inject("UserSource") private userSource: UserSource
  ) {
    super()
  }

  async signup(arg: AuthSourceSignupArg): Promise<AuthSourceSignupRet> {
    const { email, userId, tenantId } = arg
    const sub = cuid()
    const initialPassword = randomSecret()
    const secretHash = await makePasswordHash(initialPassword)
    await this.localSessionSource.create({
      data: {
        expiresAt: getExpiresAt(),
        jwt: encodeJwt(
          {
            tenantId,
            userId: sub,
            role: "owner",
            email,
          },
          serverConfig.NEXTAUTH_SECRET
        ),
        needsPasswordInitialization: true,
        user: { connect: { id: userId } },
      },
    })
    return { sub, localAuthProps: { initialPassword, secretHash } }
  }

  async signinWithEmail(arg: AuthSourceSigninWithEmailArg): Promise<AuthSourceSigninWithEmailRet> {
    const { email, password } = arg
    const user = await this.userSource.findIfExists("EntityUserSecret", {
      where: { email, deletedAt: null },
    })
    const errorMessage = "Invalid password or user not found"
    if (!user) {
      throw new AuthenticationError(errorMessage)
    }
    const isValid = user.localSecretHash ? await verifyPassword(password, user.localSecretHash) : false
    if (!isValid) {
      throw new AuthenticationError(errorMessage)
    }
    // Check is this the first sign-in and the user needs to initialize their password.
    const existingFirstSession = await this.localSessionSource.findIfExists("EntityLocalSession", {
      where: { userId: user.id, needsPasswordInitialization: true, deletedAt: null },
    })
    // Check its expiration time just in case, and delete it if it's expired.
    if (existingFirstSession) {
      if (existingFirstSession.expiresAt < new Date()) {
        // NOTE: User needs to restart with signup if the session is expired,
        // because we don't have a way to verify the user's identity at this point.
        throw new AuthenticationError("Session expired, please sign up again")
      } else {
        // NOTE: The first session will be revoked in the initial password setting process, so we don't need to delete it here.
        const sessionCode = randomSecret()
        await this.localSessionSource.update({
          where: { id: existingFirstSession.id },
          data: { sessionCode },
        })
        throw new PasswordInitializationRequired(JSON.stringify({ code: 307, data: sessionCode }))
      }
    }

    const session = await this.localSessionSource.upsert({
      where: { userId: user.id },
      create: {
        expiresAt: getExpiresAt(),
        user: { connect: { id: user.id } },
        jwt: encodeJwt(
          {
            tenantId: user.tenantId,
            userId: user.id,
            role: user.role,
            email: user.email,
          },
          serverConfig.NEXTAUTH_SECRET
        ),
      },
      update: {
        expiresAt: getExpiresAt(),
        user: { connect: { id: user.id } },
        jwt: encodeJwt(
          {
            tenantId: user.tenantId,
            userId: user.id,
            role: user.role,
            email: user.email,
          },
          serverConfig.NEXTAUTH_SECRET
        ),
      },
    })
    const idToken = session.jwt
    const refreshToken = randomId()
    // In a real implementation, you would return a JWT or similar token here. For simplicity, we just return a dummy token.
    return { idToken, refreshToken }
  }

  async getUserOrNull(arg: AuthSourceGetUserOrNullArg): Promise<AuthSourceGetUserOrNullRet> {
    const { email } = arg
    const user = await this.userSource.findIfExists("EntityUser", {
      where: { email },
    })
    return user
  }

  async initiatePassword(arg: AuthSourceInitiatePasswordArg): Promise<AuthSourceInitiatePasswordRet> {
    const { email, sessionCode, newPassword } = arg
    const user = await this.userSource.find("EntityUserSecret", {
      where: { email },
    })
    const existingSession = await this.localSessionSource.findIfExists("EntityLocalSession", {
      where: { userId: user.id, sessionCode, needsPasswordInitialization: true, deletedAt: null },
    })

    const errorMessage = "Invalid session code or session expired"
    if (!existingSession || existingSession.expiresAt < new Date()) {
      throw new AuthenticationError(errorMessage)
    }
    const refreshToken = randomId()

    await this.localSessionSource.update({
      where: { id: existingSession.id },
      data: {
        needsPasswordInitialization: false,
      },
    })

    return {
      idToken: encodeJwt(
        {
          tenantId: user.tenantId,
          userId: user.id,
          role: user.role,
          email: user.email,
        },
        cuid()
      ),
      refreshToken,
      localAuthProps: {
        secretHash: await makePasswordHash(newPassword),
      },
    }
  }

  async verifyIdToken(arg: AuthSourceVerifyIdTokenArg): Promise<void> {
    const { idToken } = arg
    const session = await this.localSessionSource.findIfExists("EntityLocalSession", {
      where: { jwt: idToken, deletedAt: null },
    })
    if (!session || session.expiresAt < new Date()) {
      throw new AuthenticationError("Invalid or expired token")
    }
  }

  async refreshIdToken(arg: AuthSourceRefreshIdTokenArg): Promise<AuthSourceRefreshIdTokenRet> {
    const { idToken, refreshToken } = arg
    const { tenantId, userId } = decodeJwt(idToken)
    const user = await this.userSource.find("EntityUserSecret", {
      where: { id: userId },
    })
    if (user.refreshToken !== refreshToken) {
      throw new AuthenticationError("Invalid refresh token")
    }

    const newSession = await this.localSessionSource.update({
      where: { userId },
      data: {
        expiresAt: getExpiresAt(),
        jwt: encodeJwt(
          {
            tenantId,
            userId: userId,
            role: user.role,
            email: user.email,
          },
          serverConfig.NEXTAUTH_SECRET
        ),
        user: { connect: { id: userId } },
      },
    })
    return { idToken: newSession.jwt }
  }

  async invite(arg: AuthSourceInviteArg): Promise<AuthSourceInviteRet> {
    const { email, tenantId, userId, role } = arg
    const sub = cuid()
    const initialPassword = randomSecret()
    const secretHash = await makePasswordHash(initialPassword)
    const exist = await this.localSessionSource.exists({
      where: { userId, needsPasswordInitialization: false },
    })

    if (exist) {
      throw new AlreadyExistsError("This user is already exists.")
    }

    await this.localSessionSource.upsert({
      where: { userId },
      create: {
        expiresAt: getExpiresAt(),
        jwt: encodeJwt(
          {
            tenantId,
            userId: sub,
            role: role,
            email,
          },
          serverConfig.NEXTAUTH_SECRET
        ),
        needsPasswordInitialization: true,
        user: { connect: { id: userId } },
      },
      update: {
        expiresAt: getExpiresAt(),
        jwt: encodeJwt(
          {
            tenantId,
            userId: sub,
            role: role,
            email,
          },
          serverConfig.NEXTAUTH_SECRET
        ),
        needsPasswordInitialization: true,
        user: { connect: { id: userId } },
      },
    })
    return { sub, localAuthProps: { initialPassword, secretHash } }
  }

  async deleteUser(arg: AuthSourceDeleteUserArg): Promise<void> {
    const { userId } = arg
    try {
      await this.localSessionSource.delete({ where: { userId } })
    } catch (e) {
      if (e instanceof NotFoundError) {
        return
      }
      throw e
    }
  }

  async resetPassword(arg: AuthSourceResetPasswordArg): Promise<AuthSourceResetPasswordRet> {
    const { userId } = arg
    const user = await this.userSource.find("EntityUserSecret", {
      where: { id: userId },
    })
    const existingSession = await this.localSessionSource.find("EntityLocalSession", {
      where: { userId: user.id },
    })
    const newPassword = randomId()
    const secretHash = await makePasswordHash(newPassword)
    await this.localSessionSource.update({
      where: { id: existingSession.id },
      data: {
        expiresAt: getExpiresAt(),
        needsPasswordInitialization: true,
      },
    })
    return { localAuthProps: { secretHash, newPassword } }
  }

  async changeRole(arg: AuthSourceChangeRoleArg): Promise<void> {
    const { userId } = arg
    // Force refresh the jwt by expiring the current session, so the new role will be reflected immediately.
    await this.localSessionSource.update({
      where: { userId },
      data: {
        // Invoke now.
        expiresAt: new Date(),
      },
    })
    return
  }
}
