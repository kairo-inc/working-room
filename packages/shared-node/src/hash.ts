import bcrypt from "bcryptjs"
import { createHash } from "node:crypto"

export const makeHash = (buffer: ArrayBuffer): string => {
  return createHash("sha256").update(Buffer.from(buffer)).digest("hex")
}

export const makePasswordHash = async (password: string): Promise<string> => {
  return bcrypt.hash(password, 12)
}

export const verifyPassword = async (password: string, hash: string): Promise<boolean> => {
  return bcrypt.compare(password, hash)
}
