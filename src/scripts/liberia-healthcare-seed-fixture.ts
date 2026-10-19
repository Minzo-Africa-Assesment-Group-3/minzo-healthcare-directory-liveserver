import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

import { z } from "zod";

const dayOfWeekSchema = z.enum([
  "MONDAY",
  "TUESDAY",
  "WEDNESDAY",
  "THURSDAY",
  "FRIDAY",
  "SATURDAY",
  "SUNDAY",
]);

const openingPeriodSchema = z.object({
  dayOfWeek: dayOfWeekSchema,
  opensAt: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
  closesAt: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
  closesNextDay: z.boolean(),
});

export const liberiaHealthcareSeedFixtureSchema = z.object({
  version: z.literal(1),
  source: z.object({
    name: z.literal("liberia-healthcare-directory"),
    fileName: z.string().min(1),
    timezone: z.literal("Africa/Monrovia"),
    recordCounts: z.object({
      facilities: z.literal(249),
      professionals: z.literal(80),
    }),
  }),
  catalogs: z.object({
    facilityTypes: z.array(
      z.object({
        code: z.enum(["HOSPITAL", "CLINIC", "PHARMACY"]),
        name: z.string().min(1),
      }),
    ),
    services: z.array(
      z.object({
        slug: z.string().min(1),
        name: z.string().min(1),
      }),
    ),
    openingHourSchedules: z.array(
      z.object({
        code: z.string().min(1),
        sourceLabel: z.string().min(1),
        openingPeriods: z.array(openingPeriodSchema).min(1),
      }),
    ),
  }),
  facilities: z.array(
    z.object({
      sourceKey: z.string().startsWith("facility:").max(255),
      sourceSheet: z.literal("Facilities"),
      sourceRow: z.number().int().positive(),
      business: z.object({
        displayName: z.string().min(1),
        legalName: z.string().min(1),
        source: z.literal("IMPORTED"),
        status: z.literal("APPROVED"),
        verificationStatus: z.literal("VERIFIED"),
      }),
      primaryLocation: z.object({
        name: z.string().min(1),
        facilityTypeCode: z.enum(["HOSPITAL", "CLINIC", "PHARMACY"]),
        county: z.string().min(1),
        cityOrTown: z.string().min(1),
        addressLine: z.string().min(1).nullable(),
        contactPhone: z.string().min(1).nullable(),
        contactEmail: z.string().email().nullable(),
        additionalContactEmails: z.array(z.string().email()),
        websiteUrl: z.string().url().nullable(),
        coordinates: z.null(),
        timezone: z.literal("Africa/Monrovia"),
        status: z.literal("ACTIVE"),
        isPrimary: z.literal(true),
        openingHoursScheduleCode: z.string().min(1),
        serviceSlugs: z.array(z.string().min(1)).min(1),
      }),
    }),
  ),
  professionals: z.array(
    z.object({
      sourceKey: z.string().startsWith("professional:").max(255),
      sourceSheet: z.literal("Professionals"),
      sourceRow: z.number().int().positive(),
      facilitySourceKey: z.string().startsWith("facility:"),
      displayName: z.string().min(1),
      profession: z.enum([
        "GENERAL_PRACTITIONER",
        "DENTIST",
        "NURSE",
        "PHARMACIST",
        "PEDIATRICIAN",
        "OPHTHALMOLOGIST",
      ]),
      professionalTitle: z.string().min(1),
      phone: z.string().min(1).nullable(),
      email: z.string().email().nullable(),
      yearsExperience: z.number().int().nonnegative(),
      source: z.literal("IMPORTED"),
      verificationStatus: z.literal("UNVERIFIED"),
      isPublic: z.literal(false),
    }),
  ),
});

export type LiberiaHealthcareSeedFixture = z.infer<
  typeof liberiaHealthcareSeedFixtureSchema
>;

function assertUnique(values: readonly string[], description: string): void {
  if (new Set(values).size !== values.length) {
    throw new Error(`${description} must be unique.`);
  }
}

function validateFixtureRelationships(
  fixture: LiberiaHealthcareSeedFixture,
): void {
  if (fixture.source.recordCounts.facilities !== fixture.facilities.length) {
    throw new Error("The declared facility count does not match the fixture.");
  }

  if (
    fixture.source.recordCounts.professionals !== fixture.professionals.length
  ) {
    throw new Error(
      "The declared professional count does not match the fixture.",
    );
  }

  const facilityKeys = fixture.facilities.map(({ sourceKey }) => sourceKey);
  const serviceSlugs = fixture.catalogs.services.map(({ slug }) => slug);
  const scheduleCodes = fixture.catalogs.openingHourSchedules.map(
    ({ code }) => code,
  );

  assertUnique(facilityKeys, "Facility source keys");
  assertUnique(serviceSlugs, "Service slugs");
  assertUnique(scheduleCodes, "Opening schedule codes");
  assertUnique(
    fixture.professionals.map(({ sourceKey }) => sourceKey),
    "Professional source keys",
  );

  const facilityKeySet = new Set(facilityKeys);
  const serviceSlugSet = new Set(serviceSlugs);
  const scheduleCodeSet = new Set(scheduleCodes);

  for (const facility of fixture.facilities) {
    if (facility.business.legalName !== facility.business.displayName) {
      throw new Error(
        `Imported legal name must match the workbook facility name for ${facility.sourceKey}.`,
      );
    }

    if (
      !scheduleCodeSet.has(
        facility.primaryLocation.openingHoursScheduleCode,
      )
    ) {
      throw new Error(`Unknown opening schedule for ${facility.sourceKey}.`);
    }

    for (const serviceSlug of facility.primaryLocation.serviceSlugs) {
      if (!serviceSlugSet.has(serviceSlug)) {
        throw new Error(
          `Unknown service ${serviceSlug} for ${facility.sourceKey}.`,
        );
      }
    }
  }

  for (const professional of fixture.professionals) {
    if (!facilityKeySet.has(professional.facilitySourceKey)) {
      throw new Error(
        `${professional.sourceKey} references an unknown facility source key.`,
      );
    }
  }
}

export async function loadLiberiaHealthcareSeedFixture(): Promise<
  LiberiaHealthcareSeedFixture
> {
  const fixturePath = resolve(
    process.cwd(),
    "prisma/seed-data/liberia-healthcare-directory.json",
  );
  const fileContents = await readFile(fixturePath, "utf8");
  const fixture = liberiaHealthcareSeedFixtureSchema.parse(
    JSON.parse(fileContents) as unknown,
  );

  validateFixtureRelationships(fixture);

  return fixture;
}
