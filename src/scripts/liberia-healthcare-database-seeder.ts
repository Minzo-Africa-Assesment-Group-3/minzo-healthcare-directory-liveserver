import { createHash, randomUUID } from "node:crypto";

import type { Prisma } from "../generated/prisma/client.js";
import type { DatabaseClient } from "../infrastructure/database/index.js";
import type { LiberiaHealthcareSeedFixture } from "./liberia-healthcare-seed-fixture.js";

type Facility = LiberiaHealthcareSeedFixture["facilities"][number];
type Professional = LiberiaHealthcareSeedFixture["professionals"][number];
type OpeningSchedule = LiberiaHealthcareSeedFixture["catalogs"]["openingHourSchedules"][number];

const importedFacilityEntityType = "BUSINESS_LOCATION";
const importedProfessionalEntityType = "BUSINESS_STAFF_MEMBER";

export interface LiberiaHealthcareSeedResult {
  counties: number;
  cities: number;
  services: number;
  facilitiesCreated: number;
  facilitiesUpdated: number;
  facilitiesUnchanged: number;
  professionalsCreated: number;
  professionalsUpdated: number;
  professionalsUnchanged: number;
}

interface SeedContext {
  batchId: string;
  database: DatabaseClient;
  fixture: LiberiaHealthcareSeedFixture;
  scheduleByCode: ReadonlyMap<string, OpeningSchedule>;
  serviceIdBySlug: ReadonlyMap<string, string>;
}

function createSlug(value: string): string {
  return value
    .normalize("NFKD")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function createStableResourceSlug(name: string, sourceKey: string, maximumLength = 220): string {
  const suffix = createHash("sha256").update(sourceKey).digest("hex").slice(0, 8);
  const nameLimit = maximumLength - suffix.length - 1;
  const namePart = createSlug(name).slice(0, nameLimit) || "healthcare-facility";

  return `${namePart}-${suffix}`;
}

function createPayloadHash(value: unknown): string {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

function timeToMinutes(time: string): number {
  const [hours = 0, minutes = 0] = time.split(":").map(Number);

  return hours * 60 + minutes;
}

function selectPrimaryPhone(phone: string | null): string | null {
  return phone?.split("/")[0]?.trim() || null;
}

function requireMapValue<T>(values: ReadonlyMap<string, T>, key: string, description: string): T {
  const value = values.get(key);

  if (value === undefined) {
    throw new Error(`Missing ${description}: ${key}.`);
  }

  return value;
}

function createOpeningPeriods(schedule: OpeningSchedule) {
  return schedule.openingPeriods.map((period) => {
    const opensAtMinutes = timeToMinutes(period.opensAt);
    const closesAtMinutes = timeToMinutes(period.closesAt);
    const isFullDay = period.closesNextDay && opensAtMinutes === closesAtMinutes;

    return {
      dayOfWeek: period.dayOfWeek,
      opensAtMinutes,
      closesAtMinutes: isFullDay ? 24 * 60 : closesAtMinutes,
      closesNextDay: isFullDay ? false : period.closesNextDay
    };
  });
}

async function startImportBatch(database: DatabaseClient, fixture: LiberiaHealthcareSeedFixture) {
  const existingBatch = await database.importBatch.findFirst({
    where: {
      source: fixture.source.name,
      sourceFileName: fixture.source.fileName
    },
    orderBy: { createdAt: "asc" }
  });

  if (existingBatch) {
    return database.importBatch.update({
      where: { id: existingBatch.id },
      data: {
        status: "PENDING",
        startedAt: new Date(),
        completedAt: null
      }
    });
  }

  return database.importBatch.create({
    data: {
      source: fixture.source.name,
      sourceFileName: fixture.source.fileName
    }
  });
}

async function seedGeography(
  database: DatabaseClient,
  fixture: LiberiaHealthcareSeedFixture
): Promise<{ cities: number; counties: number }> {
  const citiesByCounty = new Map<string, Set<string>>();

  for (const facility of fixture.facilities) {
    const { cityOrTown, county } = facility.primaryLocation;
    const cities = citiesByCounty.get(county) ?? new Set<string>();
    cities.add(cityOrTown);
    citiesByCounty.set(county, cities);
  }

  let cityCount = 0;

  for (const [countyName, cities] of citiesByCounty) {
    const county = await database.county.upsert({
      where: { slug: createSlug(countyName) },
      update: { name: countyName },
      create: {
        name: countyName,
        slug: createSlug(countyName)
      }
    });

    for (const cityName of cities) {
      const slug = createSlug(cityName);

      await database.city.upsert({
        where: {
          countyId_slug: {
            countyId: county.id,
            slug
          }
        },
        update: { name: cityName },
        create: {
          countyId: county.id,
          name: cityName,
          slug
        }
      });
      cityCount += 1;
    }
  }

  return {
    cities: cityCount,
    counties: citiesByCounty.size
  };
}

async function seedServices(
  database: DatabaseClient,
  fixture: LiberiaHealthcareSeedFixture
): Promise<Map<string, string>> {
  const serviceIdBySlug = new Map<string, string>();

  for (const serviceFixture of fixture.catalogs.services) {
    const service = await database.service.upsert({
      where: { slug: serviceFixture.slug },
      update: { name: serviceFixture.name },
      create: serviceFixture
    });
    serviceIdBySlug.set(service.slug, service.id);
  }

  return serviceIdBySlug;
}

function createLocationServiceRows(
  locationId: string,
  serviceSlugs: readonly string[],
  serviceIdBySlug: ReadonlyMap<string, string>
) {
  return serviceSlugs.map((serviceSlug) => ({
    businessLocationId: locationId,
    serviceId: requireMapValue(serviceIdBySlug, serviceSlug, "service ID for slug")
  }));
}

async function findImportedRecord(database: DatabaseClient, source: string, sourceKey: string) {
  return database.importedRecord.findUnique({
    where: {
      source_sourceKey: {
        source,
        sourceKey
      }
    }
  });
}

async function createFacility(
  context: SeedContext,
  facility: Facility,
  payloadHash: string
): Promise<string> {
  const { batchId, database, fixture, scheduleByCode, serviceIdBySlug } = context;
  const businessId = randomUUID();
  const locationId = randomUUID();
  const { business, primaryLocation } = facility;
  const schedule = requireMapValue(
    scheduleByCode,
    primaryLocation.openingHoursScheduleCode,
    "opening schedule"
  );

  await database.$transaction(async (transaction) => {
    await transaction.business.create({
      data: {
        id: businessId,
        displayName: business.displayName,
        legalName: business.legalName,
        slug: createStableResourceSlug(business.displayName, facility.sourceKey),
        source: business.source,
        status: business.status,
        verificationStatus: business.verificationStatus,
        approvedAt: new Date()
      }
    });

    await transaction.businessLocation.create({
      data: {
        id: locationId,
        businessId,
        name: primaryLocation.name,
        slug: createStableResourceSlug(primaryLocation.name, facility.sourceKey),
        facilityType: primaryLocation.facilityTypeCode,
        contactEmail: primaryLocation.contactEmail,
        contactPhone: selectPrimaryPhone(primaryLocation.contactPhone),
        websiteUrl: primaryLocation.websiteUrl,
        addressLine: primaryLocation.addressLine,
        county: primaryLocation.county,
        cityOrTown: primaryLocation.cityOrTown,
        timezone: primaryLocation.timezone,
        status: primaryLocation.status,
        isPrimary: primaryLocation.isPrimary,
        openingPeriods: {
          create: createOpeningPeriods(schedule)
        },
        services: {
          create: createLocationServiceRows(locationId, primaryLocation.serviceSlugs, serviceIdBySlug).map(
            ({ serviceId }) => ({ serviceId })
          )
        }
      }
    });

    await transaction.importedRecord.create({
      data: {
        importBatchId: batchId,
        source: fixture.source.name,
        sourceKey: facility.sourceKey,
        sourceSheet: facility.sourceSheet,
        sourceRow: facility.sourceRow,
        payloadHash,
        entityType: importedFacilityEntityType,
        entityId: locationId
      }
    });
  });

  return locationId;
}

async function updateFacility(
  context: SeedContext,
  facility: Facility,
  location: { businessId: string; id: string },
  importedRecordId: string,
  payloadHash: string
): Promise<void> {
  const { batchId, database, scheduleByCode, serviceIdBySlug } = context;
  const { business, primaryLocation } = facility;
  const schedule = requireMapValue(
    scheduleByCode,
    primaryLocation.openingHoursScheduleCode,
    "opening schedule"
  );

  await database.$transaction(async (transaction) => {
    await transaction.business.update({
      where: { id: location.businessId },
      data: {
        displayName: business.displayName,
        source: business.source,
        verificationStatus: business.verificationStatus
      }
    });

    await transaction.business.updateMany({
      where: {
        id: location.businessId,
        legalName: null
      },
      data: { legalName: business.legalName }
    });

    await transaction.businessLocation.update({
      where: { id: location.id },
      data: {
        name: primaryLocation.name,
        facilityType: primaryLocation.facilityTypeCode,
        contactEmail: primaryLocation.contactEmail,
        contactPhone: selectPrimaryPhone(primaryLocation.contactPhone),
        websiteUrl: primaryLocation.websiteUrl,
        addressLine: primaryLocation.addressLine,
        county: primaryLocation.county,
        cityOrTown: primaryLocation.cityOrTown,
        timezone: primaryLocation.timezone,
        isPrimary: primaryLocation.isPrimary
      }
    });

    await transaction.businessLocationOpeningPeriod.deleteMany({
      where: { businessLocationId: location.id }
    });
    await transaction.businessLocationOpeningPeriod.createMany({
      data: createOpeningPeriods(schedule).map((period) => ({
        businessLocationId: location.id,
        ...period
      }))
    });

    await transaction.businessLocationService.deleteMany({
      where: { businessLocationId: location.id }
    });
    await transaction.businessLocationService.createMany({
      data: createLocationServiceRows(location.id, primaryLocation.serviceSlugs, serviceIdBySlug)
    });

    await transaction.importedRecord.update({
      where: { id: importedRecordId },
      data: {
        importBatchId: batchId,
        sourceSheet: facility.sourceSheet,
        sourceRow: facility.sourceRow,
        payloadHash,
        entityId: location.id
      }
    });
  });
}

async function seedFacilities(context: SeedContext): Promise<{
  created: number;
  locationIdBySourceKey: Map<string, string>;
  unchanged: number;
  updated: number;
}> {
  const { database, fixture } = context;
  const locationIdBySourceKey = new Map<string, string>();
  let created = 0;
  let unchanged = 0;
  let updated = 0;

  for (const facility of fixture.facilities) {
    const payloadHash = createPayloadHash(facility);
    const importedRecord = await findImportedRecord(database, fixture.source.name, facility.sourceKey);

    if (!importedRecord) {
      const locationId = await createFacility(context, facility, payloadHash);
      locationIdBySourceKey.set(facility.sourceKey, locationId);
      created += 1;
      continue;
    }

    if (importedRecord.entityType !== importedFacilityEntityType) {
      throw new Error(`${facility.sourceKey} is not mapped to a business location.`);
    }

    const location = await database.businessLocation.findUnique({
      where: { id: importedRecord.entityId },
      select: { id: true, businessId: true }
    });

    if (!location) {
      throw new Error(`Imported facility ${facility.sourceKey} points to a missing location.`);
    }

    locationIdBySourceKey.set(facility.sourceKey, location.id);

    if (importedRecord.payloadHash === payloadHash) {
      unchanged += 1;
      continue;
    }

    await updateFacility(context, facility, location, importedRecord.id, payloadHash);
    updated += 1;
  }

  return { created, locationIdBySourceKey, unchanged, updated };
}

async function createProfessional(
  transaction: Prisma.TransactionClient,
  professional: Professional,
  businessLocationId: string
) {
  return transaction.businessStaffMember.create({
    data: {
      businessLocationId,
      displayName: professional.displayName,
      profession: professional.profession,
      professionalTitle: professional.professionalTitle,
      phone: professional.phone,
      email: professional.email,
      yearsExperience: professional.yearsExperience,
      isPublic: professional.isPublic,
      verificationStatus: professional.verificationStatus,
      source: professional.source
    }
  });
}

async function seedProfessionals(
  context: SeedContext,
  locationIdBySourceKey: ReadonlyMap<string, string>
): Promise<{ created: number; unchanged: number; updated: number }> {
  const { batchId, database, fixture } = context;
  let created = 0;
  let unchanged = 0;
  let updated = 0;

  for (const professional of fixture.professionals) {
    const businessLocationId = requireMapValue(
      locationIdBySourceKey,
      professional.facilitySourceKey,
      "business location for professional"
    );
    const payloadHash = createPayloadHash(professional);
    const importedRecord = await findImportedRecord(database, fixture.source.name, professional.sourceKey);

    if (!importedRecord) {
      await database.$transaction(async (transaction) => {
        const staffMember = await createProfessional(transaction, professional, businessLocationId);

        await transaction.importedRecord.create({
          data: {
            importBatchId: batchId,
            source: fixture.source.name,
            sourceKey: professional.sourceKey,
            sourceSheet: professional.sourceSheet,
            sourceRow: professional.sourceRow,
            payloadHash,
            entityType: importedProfessionalEntityType,
            entityId: staffMember.id
          }
        });
      });
      created += 1;
      continue;
    }

    if (importedRecord.entityType !== importedProfessionalEntityType) {
      throw new Error(`${professional.sourceKey} is not mapped to a staff member.`);
    }

    const staffMember = await database.businessStaffMember.findUnique({
      where: { id: importedRecord.entityId },
      select: { id: true }
    });

    if (!staffMember) {
      throw new Error(`Imported professional ${professional.sourceKey} points to missing staff.`);
    }

    if (importedRecord.payloadHash === payloadHash) {
      unchanged += 1;
      continue;
    }

    await database.$transaction(async (transaction) => {
      await transaction.businessStaffMember.update({
        where: { id: staffMember.id },
        data: {
          businessLocationId,
          displayName: professional.displayName,
          profession: professional.profession,
          professionalTitle: professional.professionalTitle,
          phone: professional.phone,
          email: professional.email,
          yearsExperience: professional.yearsExperience,
          source: professional.source
        }
      });

      await transaction.importedRecord.update({
        where: { id: importedRecord.id },
        data: {
          importBatchId: batchId,
          sourceSheet: professional.sourceSheet,
          sourceRow: professional.sourceRow,
          payloadHash,
          entityId: staffMember.id
        }
      });
    });
    updated += 1;
  }

  return { created, unchanged, updated };
}

export async function seedLiberiaHealthcareDirectory(
  database: DatabaseClient,
  fixture: LiberiaHealthcareSeedFixture
): Promise<LiberiaHealthcareSeedResult> {
  const batch = await startImportBatch(database, fixture);

  try {
    const geography = await seedGeography(database, fixture);
    const serviceIdBySlug = await seedServices(database, fixture);
    const context: SeedContext = {
      batchId: batch.id,
      database,
      fixture,
      scheduleByCode: new Map(
        fixture.catalogs.openingHourSchedules.map((schedule) => [schedule.code, schedule])
      ),
      serviceIdBySlug
    };
    const facilities = await seedFacilities(context);
    const professionals = await seedProfessionals(context, facilities.locationIdBySourceKey);

    await database.importBatch.update({
      where: { id: batch.id },
      data: {
        status: "COMPLETED",
        completedAt: new Date()
      }
    });

    return {
      counties: geography.counties,
      cities: geography.cities,
      services: serviceIdBySlug.size,
      facilitiesCreated: facilities.created,
      facilitiesUpdated: facilities.updated,
      facilitiesUnchanged: facilities.unchanged,
      professionalsCreated: professionals.created,
      professionalsUpdated: professionals.updated,
      professionalsUnchanged: professionals.unchanged
    };
  } catch (error) {
    await database.importBatch.update({
      where: { id: batch.id },
      data: {
        status: "FAILED",
        completedAt: new Date()
      }
    });
    throw error;
  }
}
