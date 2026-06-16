import { NextApiRequest, NextApiResponse } from "next"
import { getServerSession } from "next-auth"

import { AuthenticationError, NotFoundError } from "@wr/shared"
import { runWithPrivateContext } from "@wr/shared-node"

import { nextAuthOptions } from "../server/auth"

type ErrorResponse = {
  error: string
}
type API<T> = (req: NextApiRequest, res: NextApiResponse<T | ErrorResponse>) => Promise<T>
type Method = "GET" | "POST" | "PUT" | "DELETE"

export const apiHander = <T>({ method, fn }: { method: Method; fn: API<T> }) => {
  return async (req: NextApiRequest, res: NextApiResponse<T | ErrorResponse>): Promise<void> => {
    const reqMethod = req.method?.toUpperCase()
    if (reqMethod !== method) {
      res.setHeader("Allow", method)
      res.status(405).end(`Method ${reqMethod} Not Allowed`)
      return
    }

    const session = await getServerSession(req, res, nextAuthOptions)
    if (!session || !session.idToken) {
      throw new AuthenticationError("Session not found")
    }
    const idToken = session.idToken
    // Check idToken validity
    try {
      await runWithPrivateContext({ idToken }, async () => {
        return await fn(req, res)
      })
    } catch (error) {
      console.error("Error occurred:", error)
      if (error instanceof AuthenticationError) {
        res.status(401).end("Unauthorized")
      } else if (error instanceof NotFoundError) {
        res.status(404).end("Not Found")
      } else {
        const message = error instanceof Error ? error.message : "Unknown error"
        res.status(500).json({ error: message })
      }
    }
    return
  }
}
