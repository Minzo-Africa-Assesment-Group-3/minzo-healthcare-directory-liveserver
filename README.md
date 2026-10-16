# Minzo Health Directory

Express 5, TypeScript, ts-rest, and Prisma 7 foundation using Vertical Slice Architecture.

## Run locally

Use Node.js 22. Install dependencies with `npm ci`, copy `.env.example` to `.env` if needed, and configure `DATABASE_URL` for an existing PostgreSQL database.

```sh
npm run db:generate
npm run dev
```

- Health: http://127.0.0.1:3000/api/v1/health
- Swagger: http://127.0.0.1:3000/docs
- OpenAPI: http://127.0.0.1:3000/openapi.json

Health returns `{"status":"ok"}`. It checks HTTP availability; the server also verifies the database connection before listening. It does not continuously check database readiness.

## Architecture

- `src/features/system/queries`: the health contract and handler.
- `src/features/system/routes.ts`: feature composition.
- `src/routes.ts`: application contract and endpoint registration.
- `src/app.ts`: middleware ordering and Express configuration.
- `src/bootstrap`: dependency construction.
- `src/server.ts`: startup, database connection, and graceful shutdown.
- `src/infrastructure`: logging, database, email, storage, and API documentation adapters.
- `src/shared`: reusable errors, authentication primitives, pagination, and middleware.

The active API contains the health endpoint and the implemented public authentication endpoints:

- `GET /api/v1/health`
- `POST /api/v1/auth/register/user`
- `POST /api/v1/auth/register/business`
- `POST /api/v1/auth/login`
- `POST /api/v1/auth/login/verify-otp`
- `POST /api/v1/auth/refresh`
- `POST /api/v1/auth/logout`
- `POST /api/v1/auth/verify-email`
- `POST /api/v1/auth/resend-verification`

The business-management slices under `src/features/businesses` remain work in progress and are not registered by the server. Their integration tests mount the routes through `src/test/create-business-test-app.ts`.

Copied full-application bootstrap examples are preserved as `.ts.txt` files in `docs/reference`. They refer to features that have not been added yet and are reference material rather than executable source.

Define each new slice's request/response contract and handler, compose it in its feature routes, then register the feature in `src/routes.ts`. Swagger derives paths from the same contracts.

## Database

The schema now includes the initial identity, business, and geography models. Add or edit models under `prisma/models`, then run `npm run db:migrate:dev -- --name your_change` and `npm run db:generate`. Deploy committed migrations with `npm run db:migrate:deploy`. No seeder exists yet.

PostGIS is required by the geography fields in the initial migration. Configure `MINZO_DB_PASSWORD`, choose an unused `MINZO_DB_PORT` (default 5434), and run `docker compose up -d database`. Set `DATABASE_URL` to the container credentials and port, then run `npm run db:migrate:deploy`. The migration enables the PostGIS extension before creating geography columns. The image uses AMD64 emulation on Apple Silicon. Starting the container does not transfer existing database contents.

## Verification

```sh
npm run typecheck
npm run lint
npm test
npm run build
npm start
```

CI runs these checks without requiring a live database. Tests cover health, documentation scope, error responses, CORS, rate limits, and pagination. Production compilation excludes tests.

## Deployment

Build command: `npm ci --include=dev && npm run build`

Start command: `npm run db:migrate:deploy && npm start`. The deployment database must support PostGIS and allow its extension to be enabled.

Set `HOST=0.0.0.0`, `NODE_ENV=production`, the deployed database URL, and the exact frontend CORS origins. Set proxy trust to match the hosting network. Keep secrets in the host's environment settings.

Rate limiting uses process memory and resets at restart. Add a shared store only if deploying multiple instances. Health is excluded from the general limiter.
