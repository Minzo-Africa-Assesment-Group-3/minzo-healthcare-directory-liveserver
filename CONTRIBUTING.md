# Contributing to Minzo Express Boilerplate

Thank you for contributing. This project is intended to remain a small,
production-ready foundation that teams can understand and extend without
unnecessary abstractions.

## Prerequisites

- Node.js 22 LTS
- npm
- PostgreSQL
- Git

## Local setup

1. Install the dependencies:

   ```bash
   npm install
   ```

2. Create your local environment file:

   ```bash
   cp .env.example .env
   ```

3. Update `DATABASE_URL` in `.env` for your PostgreSQL installation. Never
   commit `.env` or real credentials.

4. Generate the Prisma client:

   ```bash
   npm run db:generate
   ```

5. Apply the development migrations:

   ```bash
   npm run db:migrate:dev
   ```

6. Seed the normalized healthcare directory:

   ```bash
   npm run db:seed
   ```

7. Start the development server:

   ```bash
   npm run dev
   ```

The API documentation is available at `http://127.0.0.1:3000/docs` by
default, and the OpenAPI document is available at `/openapi.json`.

## Architecture

The application is a modular monolith organized with Vertical Slice
Architecture and lightweight CQRS.

```text
src/
├── features/          Business capabilities and their vertical slices
├── infrastructure/    Database, logging, OpenAPI, and external concerns
├── shared/            Small, genuinely cross-cutting building blocks
├── config/            Validated application configuration
├── routes.ts          Application contract and handler composition
├── app.ts             Express application composition
└── server.ts          Process startup and graceful shutdown
```

Commands change application state. Queries read application state. Keep them
separate when that distinction is meaningful, but do not introduce buses,
mediators, repositories, or use-case classes merely to satisfy a pattern.

### Adding an HTTP slice

A typical query is organized like this:

```text
src/features/users/queries/list-users/
├── list-users.contract.ts
├── list-users.handler.ts
└── list-users.test.ts
```

- The **contract** is the single source of truth for the HTTP method, path,
  request validation, response validation, and OpenAPI information.
- The **handler** coordinates the request and returns one of the responses
  declared by the contract.
- The **test** verifies externally observable behavior.
- Add a `*.use-case.ts` only when business or application behavior is
  substantial enough to benefit from separation. A trivial object return does
  not need another file.
- Compose the slice contract and handler in the feature's `routes.ts`, then
  compose that feature at the application level in `src/routes.ts`.

Do not declare the same Express route separately for documentation. ts-rest
generates OpenAPI from the contract.

## Project conventions

### TypeScript and modules

- Keep TypeScript strict and avoid `any`.
- This is an ES Modules project.
- Include `.js` in relative imports, even when importing a `.ts` source file:

  ```typescript
  import { createApp } from "./app.js";
  ```

- Prefer named exports and type-only imports where appropriate.
- Keep dependencies explicit. Avoid global mutable state and hidden service
  locators.

### Validation and responses

- Validate all untrusted input at the HTTP boundary with Zod.
- Declare successful response shapes in the ts-rest contract.
- Return errors using the shared RFC Problem Details implementation.
- Do not expose internal errors, stack traces, secrets, or database details to
  API clients.
- Use the shared pagination utilities for page-based list endpoints. Features
  remain responsible for their own Prisma queries and filters.

### Database changes

- Keep Prisma schema changes focused and reviewable.
- Create a named development migration with:

  ```bash
  npm run db:migrate:dev -- --name describe_the_change
  ```

- Commit the Prisma schema and generated migration files.
- Do not commit `src/generated/prisma`; it is generated during setup and build.
- Do not modify a migration that has already been applied in a shared
  environment. Add a corrective migration instead.
- Use transactions when several writes must succeed or fail together.

### Logging and security

- Use the shared Pino logger instead of `console.log`.
- Log useful structured context, including the request ID when investigating a
  request.
- Never log passwords, tokens, authorization headers, secrets, or sensitive
  personal information.
- Treat all client input as untrusted and use deny-by-default authorization
  when protected features are introduced.

## Quality checks

Run these commands before opening a pull request:

```bash
npm run lint
npm run typecheck
npm test
npm run build
```

ESLint can automatically correct some safe issues:

```bash
npm run lint:fix
```

Review automatic changes before committing them. Do not disable a rule merely
to make a warning disappear; document the reason when an exception is truly
necessary.

Add tests for new behavior and regressions. Prefer integration tests at the
HTTP boundary for slices, with focused unit tests for business logic that has
meaningful branching or edge cases.

## Git workflow

- Create a focused branch from the current shared branch.
- Keep commits small and related to one concern.
- Use clear Conventional Commit-style messages, for example:

  ```text
  feat: add user registration
  fix: prevent reuse of revoked refresh tokens
  test: cover pagination boundaries
  refactor: simplify authorization policy loading
  docs: explain local database setup
  ```

- Do not commit secrets, `.env`, generated Prisma clients, build output, logs,
  or unrelated editor files.
- Do not mix broad refactoring with a feature or bug fix unless the refactoring
  is required for that change.

## Pull request checklist

Before requesting review, confirm that:

- [ ] The change has a clear purpose and limited scope.
- [ ] Architectural decisions or important tradeoffs are explained.
- [ ] Request and response schemas reflect the implemented behavior.
- [ ] Error paths and security implications were considered.
- [ ] New behavior and relevant edge cases are tested.
- [ ] `npm run lint` passes.
- [ ] `npm run typecheck` passes.
- [ ] `npm test` passes.
- [ ] `npm run build` passes.
- [ ] Database migrations are included when required.
- [ ] Documentation and `.env.example` are updated when configuration changes.
- [ ] No secrets, generated clients, or unrelated changes are included.

## Review expectations

Reviews should prioritize correctness, security, maintainability, and clear
feature boundaries. Separate required changes from optional suggestions, and
explain the reasoning behind requested changes. Be direct and respectful; the
goal is shared ownership and a codebase that the next engineer can understand.
