import type { NextConfig } from "next"
import { withSuperjson } from "next-superjson"

const nextConfig: NextConfig = {
  reactStrictMode: true,
  output: "standalone",
  devIndicators: false,
  transpilePackages: ["@prisma/client"],
  webpack(config) {
    config.module.rules.push({
      test: /\.svg$/i,
      issuer: /\.[jt]sx?$/,
      use: ["@svgr/webpack"],
    })
    return config
  },
}

export default withSuperjson()(nextConfig)
