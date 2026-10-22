# Contributing

Thank you for contributing to the Minzo Healthcare Directory API.

## Before You Start

- Check the existing feature structure before creating new files.
- Keep each change focused on one business feature or concern.
- Discuss major architecture or data-model changes before implementing them.
- Do not introduce a new dependency unless there is a clear product or technical need.

## Feature Structure

This project uses Vertical Slice Architecture.

New business functionality should normally live under `src/features/<feature-name>/`.

For example:

```text
src/features/businesses/
├── commands/
├── queries/
├── routes.ts
└── businesses.test.ts
```

Keep the request contract, validation, handler, business rules, and tests close to the feature they support.

Avoid placing business-specific logic in generic global folders.

## Commands and Queries

Use clear separation where it improves readability:

- `commands/` for operations that create, update, delete, approve, or otherwise change data.
- `queries/` for operations that only retrieve data.

Do not create extra abstractions for simple operations.

## API Contracts

Every endpoint should have a ts-rest contract.

The contract should define:

- HTTP method and path
- Request body, query parameters, headers, and path parameters
- Response status codes and response body shapes
- Endpoint summary and description where useful
- Authentication metadata where required

Use Zod schemas for request and response validation.

## Authentication and Authorization

- Keep authentication and authorization as separate concerns.
- Public endpoints must remain public unless protection is necessary.
- Protected actions must use the relevant route authentication middleware.
- Do not trust a user ID supplied in a request body when the authenticated identity should be used instead.
- Use deny-by-default thinking for sensitive actions.

## Rate Limiting

The API has a global rate limit for all API routes.

Only add a feature-level rate limiter when an operation has a clear abuse risk, such as:

- Credential verification
- Account registration
- Sending email
- Creating public content
- Upload authorization

Do not create a separate rate-limit policy for ordinary reads, logout, or refresh-token requests unless there is a demonstrated need.

## Database Changes

When changing Prisma models:

1. Update the relevant Prisma schema files.
2. Format and validate the schema.
3. Create a development migration.
4. Generate the Prisma client.
5. Update affected tests and seed data.

Typical commands:

```bash
npm run db:migrate:dev
npm run db:generate
npm run typecheck
npm run lint
npm test
```

Do not edit an already-applied migration. Create a new migration instead.

## File Uploads

Do not send large files through the API server unless there is a specific reason.

Use the existing upload flow:

1. Backend authorizes an upload and creates a controlled object path.
2. Client uploads directly to Supabase Storage.
3. Backend verifies the uploaded object.
4. Backend attaches the verified object to the relevant record.

Never accept an arbitrary storage object key from a client as proof of ownership.

## Code Quality

Before opening a pull request, run:

```bash
npm run typecheck
npm run lint
npm test
```

Code should be readable, typed, and focused. Avoid unrelated formatting changes or refactoring in the same pull request.

## Environment Variables and Secrets

- Never commit `.env` files or production credentials.
- Add new required variables to `.env.example` using safe placeholder values.
- Keep secrets in the deployment platform’s environment-variable settings.
- Rotate a secret immediately if it is accidentally exposed.

## Pull Requests

A pull request should:

- Have a clear title describing the change.
- Focus on one feature, fix, or refactor.
- Include database migrations when the schema changes.
- Include tests when behaviour changes.
- Explain any deployment, environment, or migration requirements.
- Avoid mixing unrelated work into the same pull request.
