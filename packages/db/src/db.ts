import { PrismaClient } from "@prisma/client"

export const createPrismaClient = (): PrismaClient => {
  const prisma = new PrismaClient({
    log: ["warn", "error"],
  })
  return prisma
}
