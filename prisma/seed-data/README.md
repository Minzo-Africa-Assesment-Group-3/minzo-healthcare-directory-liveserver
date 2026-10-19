# Liberia healthcare seed data

This folder contains a normalized, version-controlled fixture derived from
`Liberia_Healthcare_Directory.xlsx`.

The fixture is consumed by the Prisma database seed command. Files in this
folder remain source data; database writes are performed by the seed script in
`src/scripts`.

## Data model

- Each spreadsheet facility becomes one imported business with one primary
  location.
- Because the workbook provides one facility-name column rather than separate
  display and legal names, the initial imported `legalName` matches
  `displayName`. A later claim or administrator correction is preserved by
  subsequent seed runs.
- `sourceKey` is the stable import identity used for idempotent seeding.
- Professionals reference `facilitySourceKey`, so associations do not depend
  on database IDs or repeated free-text matching.
- Facility types, services, and opening-hour schedules are normalized into
  reusable catalogs.
- When a source cell contains multiple facility emails, the first is the
  primary `contactEmail` and the rest are retained in
  `additionalContactEmails`.
- When a facility phone cell contains multiple numbers, the seeder stores the
  first number as the primary contact phone while the fixture retains the
  original source value.
- Coordinates remain `null` because the workbook does not provide them.
- Imported facilities are approved for listing but remain unverified.
- Imported professional records are unverified and private by default until
  Minzo administrators confirm consent or another lawful basis for publishing
  their personal contact information.

## Regenerate the fixture

From the repository root, run:

```bash
python3 prisma/seed-data/normalize_liberia_healthcare.py \
  "/Users/admin/Downloads/Liberia_Healthcare_Directory.xlsx" \
  prisma/seed-data/liberia-healthcare-directory.json
```

The source workbook is read only and is never modified.

## Validate the fixture

```bash
npm run data:validate:liberia-healthcare
```

Validation checks the structure, counts, unique source keys, service and
opening-schedule references, and every professional-to-facility association.

## Seed the database

Apply committed migrations first, then run:

```bash
npm run db:seed
```

The seeder is idempotent. Stable `sourceKey` values are recorded in
`ImportedRecord`, allowing repeat runs to skip unchanged records and update
changed source records without creating duplicates. Existing business and
professional moderation decisions are not reset by later seed runs.
