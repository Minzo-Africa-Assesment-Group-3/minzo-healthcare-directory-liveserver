# syntax=docker/dockerfile:1.7

FROM node:22-bookworm-slim AS base

WORKDIR /app

ENV CI=true

RUN apt-get update \
    && apt-get install --yes --no-install-recommends ca-certificates openssl \
    && rm -rf /var/lib/apt/lists/*

FROM base AS build

ENV DATABASE_URL=postgresql://build:build@localhost:5432/build?schema=public

COPY package.json package-lock.json ./
RUN npm ci

COPY prisma.config.ts tsconfig.json tsconfig.build.json ./
COPY prisma ./prisma
COPY src ./src

RUN npm run build

FROM base AS production-dependencies

COPY package.json package-lock.json ./
RUN npm ci --omit=dev \
    && npm cache clean --force

FROM base AS runtime

ENV NODE_ENV=production \
    HOST=0.0.0.0 \
    PORT=3000

RUN groupadd --gid 1001 minzo \
    && useradd --uid 1001 --gid minzo --create-home --shell /usr/sbin/nologin minzo

COPY --from=production-dependencies --chown=minzo:minzo /app/node_modules ./node_modules
COPY --from=build --chown=minzo:minzo /app/dist ./dist
COPY --from=build --chown=minzo:minzo /app/prisma ./prisma
COPY --chown=minzo:minzo package.json package-lock.json prisma.config.ts ./

USER minzo

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:' + (process.env.PORT || '3000') + '/api/v1/health').then((response) => { if (!response.ok) process.exit(1); }).catch(() => process.exit(1))"

CMD ["sh", "-c", "npm run db:migrate:deploy && exec node dist/server.js"]
