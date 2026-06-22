FROM node:24-alpine AS base
RUN apk add --no-cache libc6-compat openssl
WORKDIR /app

# Install dependencies
FROM base AS deps
COPY package.json yarn.lock .yarnrc.yml ./
COPY apps/web/package.json apps/web/
COPY packages/core/package.json packages/core/
COPY packages/access/package.json packages/access/
COPY packages/composition/package.json packages/composition/
COPY packages/db/package.json packages/db/
COPY packages/shared/package.json packages/shared/
COPY packages/shared-node/package.json packages/shared-node/
RUN corepack enable && yarn install

# Build
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
# COPY --from=deps /app/apps/web/node_modules ./apps/web/node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
RUN corepack enable && \
    yarn prisma:generate && \
    yarn workspace @wr/web build

# Runner
FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

COPY --from=builder --chown=nextjs:nodejs /app/apps/web/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/.next/static ./apps/web/.next/static
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/public ./apps/web/public
COPY --from=builder --chown=nextjs:nodejs /app/node_modules ./node_modules

# Need to run sqlite migration in the container, so copy prisma files as well.
# These lines can be removed if you switch to a different database that doesn't require migration in the container.
COPY --from=builder --chown=nextjs:nodejs /app/package.json ./package.json
COPY --from=builder --chown=nextjs:nodejs /app/yarn.lock ./yarn.lock
COPY --from=builder --chown=nextjs:nodejs /app/.yarnrc.yml ./.yarnrc.yml
COPY --from=builder --chown=nextjs:nodejs /app/packages/db/package.json ./packages/db/package.json
COPY --from=builder --chown=nextjs:nodejs /app/packages/db/prisma ./packages/db/prisma

COPY --chown=nextjs:nodejs ./apps/web/docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh
RUN chmod +x /usr/local/bin/docker-entrypoint.sh

# Prisma Client's query engine binary needs to be copied manually to ensure it's included in the final image.
# This is a workaround for an issue where the binary is not included due to how Prisma Client is built and how Docker's multi-stage builds work.
RUN find /app -name "libquery_engine-linux-musl-openssl-3.0.x.so.node" -print
RUN find /app -name "libquery_engine-linux-musl-openssl-3.0.x.so.node" -exec cp {} ./apps/web/.next/server \;

RUN corepack enable && mkdir -p /app/.yarn && chown -R nextjs:nodejs /app/.yarn
RUN mkdir -p /workspace && chown nextjs:nodejs /workspace 

USER nextjs
EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

ENTRYPOINT ["docker-entrypoint.sh"]
CMD ["node", "apps/web/server.js"]
