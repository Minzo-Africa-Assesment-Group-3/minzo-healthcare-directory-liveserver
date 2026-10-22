# Minzo Healthcare Directory API

Backend API for the Minzo Healthcare Directory. It supports public healthcare-facility discovery, account registration, business onboarding, email verification, reviews, facility ownership claims, and supporting directory data such as counties and cities.

The API is built as a modular monolith: one deployable application with business features separated into clear modules.

## What the API Does

Current capabilities include:

- Register an individual user account
- Register a business account and healthcare facility
- Verify user email addresses
- Sign in using password and email OTP
- Issue short-lived access tokens and secure refresh-token cookies
- View the authenticated user profile
- Create, update, delete, and browse customer reviews
- Search and view approved healthcare facilities
- Browse counties and cities
- Upload and verify business-registration documents
- Submit ownership claims for imported facility listings
- Moderate customer reviews and business claims
- Provide OpenAPI/Swagger API documentation
- Expose health checks for deployment monitoring

Some business features are intentionally still being added as the product grows.

## Technology Stack

- Node.js and TypeScript
- Express.js
- PostgreSQL with PostGIS
- Prisma ORM
- ts-rest and Zod
- Pino structured logging
- Resend for transactional email
- Supabase Storage for private document uploads
- Vitest and Supertest
- Docker for deployment

## Architecture

### Vertical Slice Architecture

The API uses Vertical Slice Architecture (VSA).

Instead of grouping the entire application into global folders such as `controllers`, `services`, and `repositories`, each business capability owns its related code.

For example:

```text
src/features/
├── auth-public/
├── businesses/
├── business-claims/
├── business-registration-documents/
├── counties/
├── cities/
├── reviews/
└── system/
```

A feature can contain its own API contract, request validation, route handler, business rules, data access, and tests. This makes it easier to find, understand, change, and test a feature without navigating unrelated parts of the codebase.

### Why We Use Vertical Slices

We chose VSA because this project has several separate business areas: public accounts, facility registration, directory search, reviews, claims, moderation, and administration.

VSA helps us:

- Keep related code close together
- Reduce coupling between unrelated features
- Avoid oversized controller and service folders
- Make onboarding easier for new developers
- Add future modules without restructuring the whole application
- Test each business workflow independently

### Lightweight CQRS

The project separates state-changing operations from read operations where it improves clarity.

```text
commands/
  register-user/
  register-business/
  create-review/

queries/
  search-businesses/
  get-public-business-profile/
  list-counties/
```

Commands change data. Queries read data.

This is intentionally lightweight. The application does not use a mediator, message bus, microservices, or separate read/write databases because those would add complexity without solving a current problem.

## Request Flow

```text
Client
  ↓
Express middleware
  ↓
ts-rest contract validation
  ↓
Feature handler
  ↓
Prisma / PostgreSQL / external service
  ↓
Standard API response or Problem Details error
```

## API Contracts and Validation

ts-rest and Zod define the API contract for each endpoint.

This gives us:

- Typed request and response shapes
- Runtime validation of request body, query parameters, headers, and path parameters
- Swagger documentation generated from the same contracts
- Less risk of frontend and backend disagreement

The contract is the source of truth for an endpoint instead of maintaining separate route, validation, type, and documentation definitions.

## Authentication Design

Public users and administrators are separate authentication realms.

Public users authenticate through the public account flow. Administrator accounts use a separate access-token configuration and are not treated as ordinary directory users.

The login flow uses:

1. Email and password validation
2. A short-lived email OTP challenge
3. Access-token issuance after OTP verification
4. A secure HTTP-only refresh-token cookie for session renewal

### Why Refresh Tokens Use HTTP-only Cookies

Refresh tokens are not returned in JSON responses or exposed to browser JavaScript.

The browser sends the refresh cookie automatically to the refresh endpoint. This reduces the risk of a refresh token being stolen through cross-site scripting.

Access tokens remain short-lived and are used for authenticated API requests.

## Authorization

Authentication answers: “Who is making this request?”

Authorization answers: “Is this user allowed to do this?”

Route-specific authentication middleware protects actions such as:

- Creating and managing reviews
- Uploading registration documents
- Claiming a facility
- Viewing the current user profile
- Moderating customer content

The API uses deny-by-default principles: protected actions require a valid authenticated identity.

## Rate Limiting

Rate limiting has two layers:

1. A global API rate limit protects all `/api` endpoints.
2. Sensitive write operations use stricter route-level policies.

Examples of stricter policies:

- Credential attempts: login and OTP verification
- Registration actions: account registration and verification-email resend
- Write actions: creating, editing, or deleting reviews

This avoids applying a special limiter to every endpoint while still protecting operations that could be abused.

## Error Handling

The API uses centralized error handling and returns RFC 9457-style Problem Details responses.

Example:

```json
{
  "type": "https://api.example.com/problems/request-validation-failed",
  "title": "Request validation failed",
  "status": 400,
  "detail": "The request did not satisfy the API contract.",
  "code": "request_validation_failed"
}
```

This gives frontend applications a predictable way to display validation, authentication, authorization, and business-rule errors.

## Database Design

PostgreSQL is the primary database.

PostGIS is enabled for location-aware facility data, allowing the application to support future proximity and radius searches.

Prisma manages database schema definitions, generated database client types, development migrations, and production migrations.

The directory includes normalized data for businesses and locations, counties and cities, facility types, services, business memberships, reviews and ratings, claims, and uploaded documents.

## File Uploads

Files are stored in Supabase Storage rather than directly in the API server.

The backend authorizes uploads and generates server-controlled object paths. The client uploads directly to storage, then the backend verifies the uploaded object before it is attached to a business registration or claim.

This keeps large files away from the API process and prevents clients from attaching arbitrary storage objects.

## Email

Resend sends transactional emails, including email verification links, login OTP codes, and other account notifications as features are added.

Email configuration is supplied through environment variables.

## API Documentation

Swagger documentation is available when the application is running.

The API contract is used to generate documentation, reducing the chance that Swagger becomes outdated.

## Testing

The project uses Vitest and Supertest.

Tests cover feature handlers, request validation, authentication middleware, error responses, API documentation, and core public workflows.

Run checks locally:

```bash
npm run typecheck
npm run lint
npm test
```

## Environment Configuration

Copy `.env.example` to `.env` and provide the required values.

Important categories include:

- Database connection
- JWT secrets
- Email provider credentials
- Supabase Storage credentials
- CORS origins
- Rate-limit settings
- AI service configuration where enabled

## Running Locally

```bash
npm install
npm run db:generate
npm run db:migrate:dev
npm run dev
```

The development server starts from `src/server.ts`.

## Useful Commands

```bash
npm run dev
npm run build
npm start

npm run typecheck
npm run lint
npm test

npm run db:generate
npm run db:migrate:dev
npm run db:migrate:deploy
npm run db:studio
```

## Contributing

Please read [CONTRIBUTING.md](./CONTRIBUTING.md) before contributing a feature, changing the database schema, or opening a pull request.

## Project Principles

- Keep features independent and easy to find
- Prefer clear code over unnecessary abstractions
- Validate all external input
- Keep authentication and authorization separate
- Use secure defaults
- Add dependencies only when a real requirement needs them
- Build for maintainability before premature scale
