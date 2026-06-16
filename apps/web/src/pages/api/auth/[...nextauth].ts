import NextAuth from "next-auth"

import { nextAuthOptions } from "../../../server/auth"

// Catch next auth client requests.
export default NextAuth(nextAuthOptions)
