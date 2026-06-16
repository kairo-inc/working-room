import type { NextConfig } from "next"
import { withSuperjson } from "next-superjson"

const nextConfig: NextConfig = {
  reactStrictMode: true,
  output: "standalone",
  devIndicators: false,
  transpilePackages: ["@prisma/client"],
  eslint: {
    ignoreDuringBuilds: true,
  },
}

export default withSuperjson()(nextConfig)
