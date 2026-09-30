# ── Stage 1: Install dependencies ────────────────────────────────────
FROM node:24-bookworm-slim AS deps
RUN corepack enable
WORKDIR /app
COPY pnpm-workspace.yaml pnpm-lock.yaml package.json ./
COPY packages/shared/package.json packages/shared/
COPY packages/server/package.json packages/server/
# Install all workspace deps (build stage is discarded)
RUN pnpm install --frozen-lockfile

# ── Stage 2: Build ───────────────────────────────────────────────────
FROM deps AS build
COPY tsconfig.base.json ./
COPY packages/shared packages/shared
COPY packages/server packages/server
RUN pnpm --filter @starter/shared run build
RUN pnpm --filter @starter/server run build
# `pnpm deploy --prod` bundles the production dependency closure into
# a self-contained directory at /prod. Crucial here: the workspace
# layout uses pnpm's symlinked node_modules (a `.pnpm/<pkg>@<ver>/...`
# central store + per-package symlink farms), so a plain
# `COPY --from=build /app/packages/server/node_modules ./node_modules`
# in the runtime stage drags dangling symlinks (the .pnpm store isn't
# copied). Deploy materialises the closure with real files + the
# workspace dependency (@starter/shared) inlined into node_modules/,
# so the runtime stage only needs the /prod tree. Requires the
# package's `dist/` to exist first — that's why the build steps above
# run before this one.
RUN pnpm --filter @starter/server --prod --legacy deploy /prod

# ── Stage 3: Production runtime ─────────────────────────────────────
FROM node:24-bookworm-slim AS runtime
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=5276

# Self-contained prod bundle from `pnpm deploy` — dist + package.json +
# node_modules (with @starter/shared materialised, no symlinks).
COPY --from=build /prod/dist ./dist
COPY --from=build /prod/package.json ./
COPY --from=build /prod/node_modules ./node_modules

USER node
EXPOSE 5276

HEALTHCHECK --interval=30s --timeout=10s --start-period=20s --retries=5 \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||'5276')+'/api/health').then(r=>{if(!r.ok)process.exit(1)}).catch(()=>process.exit(1))"

CMD ["node", "dist/index.js"]
