# ── Stage 1: Install dependencies ────────────────────────────────────
FROM node:24-bookworm-slim AS deps
RUN corepack enable
WORKDIR /app
COPY pnpm-workspace.yaml pnpm-lock.yaml package.json ./
COPY packages/shared/package.json packages/shared/
COPY packages/server/package.json packages/server/
COPY packages/client/package.json packages/client/
# Install all workspace deps (build stage is discarded)
RUN pnpm install --frozen-lockfile

# ── Stage 2: Build ───────────────────────────────────────────────────
FROM deps AS build
COPY tsconfig.base.json ./
COPY packages/shared packages/shared
COPY packages/server packages/server
COPY packages/client packages/client

# Next.js inlines NEXT_PUBLIC_* into the browser bundle at BUILD time —
# runtime env on the deployed container has no effect on browser code.
# CI passes these as --build-arg (see .github/workflows/build-and-deploy.yml).
# HATCHKIT_IMAGE_BUILD makes next.config.ts fail the build loudly when
# NEXT_PUBLIC_API_URL is missing, instead of baking a broken fallback.
ARG NEXT_PUBLIC_API_URL
ARG NEXT_PUBLIC_WS_URL
ARG NEXT_PUBLIC_OPENPANEL_CLIENT_ID
ARG NEXT_PUBLIC_PLAUSIBLE_DOMAIN
ARG NEXT_PUBLIC_PLAUSIBLE_SCRIPT_URL
ARG NEXT_PUBLIC_SENTRY_DSN
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL \
    NEXT_PUBLIC_WS_URL=$NEXT_PUBLIC_WS_URL \
    NEXT_PUBLIC_OPENPANEL_CLIENT_ID=$NEXT_PUBLIC_OPENPANEL_CLIENT_ID \
    NEXT_PUBLIC_PLAUSIBLE_DOMAIN=$NEXT_PUBLIC_PLAUSIBLE_DOMAIN \
    NEXT_PUBLIC_PLAUSIBLE_SCRIPT_URL=$NEXT_PUBLIC_PLAUSIBLE_SCRIPT_URL \
    NEXT_PUBLIC_SENTRY_DSN=$NEXT_PUBLIC_SENTRY_DSN \
    HATCHKIT_IMAGE_BUILD=1

RUN pnpm --filter @starter/shared run build
RUN pnpm --filter @starter/client run build

# ── Stage 3: Production runtime ─────────────────────────────────────
FROM node:24-bookworm-slim AS runtime
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=6999

# Next.js standalone output
COPY --from=build /app/packages/client/.next/standalone ./
COPY --from=build /app/packages/client/.next/static ./packages/client/.next/static
COPY --from=build /app/packages/client/public ./packages/client/public

USER node
EXPOSE 6999

HEALTHCHECK --interval=30s --timeout=10s --start-period=10s --retries=5 \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||'6999')).then(r=>{if(!r.ok)process.exit(1)}).catch(()=>process.exit(1))"

CMD ["node", "packages/client/server.js"]
