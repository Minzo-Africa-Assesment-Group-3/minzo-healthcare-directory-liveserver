import { randomUUID } from "node:crypto";

import type { DatabaseClient } from "../../../../infrastructure/database/index.js";
import { normalizeBusinessServices } from "../../../businesses/business-service.js";
import type { GeneratedEmailVerificationToken } from "../../services/email-verification-token.js";
import type { RegisterBusinessBody } from "./register-business.contract.js";

function createSlug(name: string, resourceId: string): string {
  const namePart = name
    .normalize("NFKD")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 200);

  return `${namePart || "location"}-${resourceId.slice(0, 8)}`;
}

function timeToMinutes(time: string): number {
  const [hours = 0, minutes = 0] = time.split(":").map(Number);

  return hours * 60 + minutes;
}

export interface RegisterBusinessCommand {
  body: RegisterBusinessBody;
  email: string;
  passwordHash: string;
  verificationToken: GeneratedEmailVerificationToken;
}

export async function registerBusiness(database: DatabaseClient, command: RegisterBusinessCommand) {
  const { body, email, passwordHash, verificationToken } = command;
  const businessId = randomUUID();
  const primaryLocationId = randomUUID();
  const primaryLocation = body.primaryLocation;
  const { location } = primaryLocation;
  const submittedAt = new Date();
  const openingPeriods =
    primaryLocation.openingHours?.flatMap((schedule) => {
      if (schedule.isClosed) {
        return [];
      }

      if (schedule.is24Hours) {
        return [
          {
            dayOfWeek: schedule.dayOfWeek,
            opensAtMinutes: 0,
            closesAtMinutes: 24 * 60,
            closesNextDay: false
          }
        ];
      }

      return schedule.periods.map((period) => ({
        dayOfWeek: schedule.dayOfWeek,
        opensAtMinutes: timeToMinutes(period.opensAt),
        closesAtMinutes: timeToMinutes(period.closesAt),
        closesNextDay: period.closesNextDay
      }));
    }) ?? [];
  const services = normalizeBusinessServices(primaryLocation.services ?? []);

  return database.$transaction(async (transaction) => {
    const user = await transaction.user.create({
      data: {
        email,
        passwordHash,
        displayName: body.user.displayName.trim(),
        phone: body.user.phone?.trim() ?? null,
        status: "PENDING_VERIFICATION",
        emailVerificationTokens: {
          create: {
            id: verificationToken.id,
            tokenHash: verificationToken.tokenHash,
            expiresAt: verificationToken.expiresAt
          }
        }
      },
      select: { id: true, email: true, displayName: true }
    });

    const business = await transaction.business.create({
      data: {
        id: businessId,
        displayName: body.business.displayName.trim(),
        legalName: body.business.legalName.trim(),
        slug: createSlug(body.business.displayName, businessId),
        registrationNumber: body.business.registrationNumber?.trim() ?? null,
        source: "SELF_REGISTERED",
        status: "PENDING_APPROVAL",
        submittedAt,
        memberships: {
          create: {
            userId: user.id,
            role: body.business.membershipRole
          }
        }
      },
      select: { id: true, displayName: true, slug: true }
    });

    const createdPrimaryLocation = await transaction.businessLocation.create({
      data: {
        id: primaryLocationId,
        businessId: business.id,
        name: primaryLocation.name.trim(),
        slug: createSlug(primaryLocation.name, primaryLocationId),
        facilityType: primaryLocation.facilityType.trim(),
        contactEmail: primaryLocation.contactEmail?.trim().toLowerCase() ?? email,
        contactPhone: primaryLocation.contactPhone?.trim() ?? null,
        websiteUrl: primaryLocation.websiteUrl?.trim() ?? null,
        description: primaryLocation.description?.trim() ?? null,
        addressLine: location.addressLine.trim(),
        county: location.county.trim(),
        cityOrTown: location.cityOrTown.trim(),
        latitude: location.latitude ?? null,
        longitude: location.longitude ?? null,
        timezone: primaryLocation.timezone,
        status: "DRAFT",
        isPrimary: true,
        ...(openingPeriods.length
          ? {
              openingPeriods: {
                create: openingPeriods
              }
            }
          : {}),
        ...(primaryLocation.staffMembers?.length
          ? {
              staffMembers: {
                create: primaryLocation.staffMembers.map((staffMember) => ({
                  displayName: staffMember.displayName.trim(),
                  profession: staffMember.profession,
                  professionalTitle: staffMember.professionalTitle?.trim() ?? null,
                  phone: staffMember.phone?.trim() ?? null,
                  email: staffMember.email?.trim().toLowerCase() ?? null,
                  yearsExperience: staffMember.yearsExperience ?? null,
                  isPublic: staffMember.isPublic,
                  source: "SELF_REGISTERED" as const
                }))
              }
            }
          : {})
      },
      select: { id: true, name: true, slug: true }
    });

    for (const serviceInput of services) {
      const service = await transaction.service.upsert({
        where: { slug: serviceInput.slug },
        update: {},
        create: {
          id: randomUUID(),
          name: serviceInput.name,
          slug: serviceInput.slug
        },
        select: { id: true }
      });

      await transaction.businessLocationService.create({
        data: {
          businessLocationId: createdPrimaryLocation.id,
          serviceId: service.id
        }
      });
    }

    return {
      user,
      business: {
        ...business,
        legalName: body.business.legalName.trim()
      },
      primaryLocation: createdPrimaryLocation
    };
  });
}
