import type {
  BusinessModerationDetailRecord,
  BusinessModerationListRecord
} from "./business-moderation.select.js";

type ModeratableBusinessStatus = "PENDING_APPROVAL" | "APPROVED" | "REJECTED";

interface RegistrationDocumentDownload {
  expiresAt: Date;
  url: string;
}

function asModeratableStatus(status: string): ModeratableBusinessStatus {
  if (status !== "PENDING_APPROVAL" && status !== "APPROVED" && status !== "REJECTED") {
    throw new Error(`Unexpected business moderation status: ${status}`);
  }

  return status;
}

function minutesAfterMidnightToTime(minutes: number): string {
  const normalizedMinutes = minutes % (24 * 60);
  const hours24 = Math.floor(normalizedMinutes / 60);
  const remainingMinutes = normalizedMinutes % 60;
  const period = hours24 < 12 ? "AM" : "PM";
  const hours12 = hours24 % 12 || 12;

  return `${hours12}:${String(remainingMinutes).padStart(2, "0")} ${period}`;
}

export function presentBusinessModerationListItem(business: BusinessModerationListRecord) {
  return {
    id: business.id,
    displayName: business.displayName,
    legalName: business.legalName,
    slug: business.slug,
    registrationNumber: business.registrationNumber,
    status: asModeratableStatus(business.status),
    verificationStatus: business.verificationStatus,
    submittedAt: business.submittedAt?.toISOString() ?? null,
    reviewedAt: business.reviewedAt?.toISOString() ?? null,
    hasRegistrationDocument: business.registrationDocumentKey !== null,
    primaryLocation: business.locations[0] ?? null,
    members: business.memberships
  };
}

export function presentBusinessModerationDetail(
  business: BusinessModerationDetailRecord,
  documentDownload: RegistrationDocumentDownload | null
) {
  const document = business.registrationDocuments[0];
  const registrationDocument = document
    ? {
        id: document.id,
        originalFileName: document.originalFileName,
        mimeType: document.verifiedMimeType!,
        sizeBytes: document.verifiedSizeBytes!,
        uploadedAt: document.uploadedAt!.toISOString(),
        downloadUrl: documentDownload!.url,
        downloadExpiresAt: documentDownload!.expiresAt.toISOString()
      }
    : null;

  return {
    id: business.id,
    displayName: business.displayName,
    legalName: business.legalName,
    slug: business.slug,
    registrationNumber: business.registrationNumber,
    source: "SELF_REGISTERED" as const,
    status: asModeratableStatus(business.status),
    verificationStatus: business.verificationStatus,
    submittedAt: business.submittedAt?.toISOString() ?? null,
    approvedAt: business.approvedAt?.toISOString() ?? null,
    rejectedAt: business.rejectedAt?.toISOString() ?? null,
    reviewedAt: business.reviewedAt?.toISOString() ?? null,
    reviewedByAdminId: business.reviewedByAdminId,
    reviewNote: business.reviewNote,
    registrationDocument,
    members: business.memberships,
    locations: business.locations.map((location) => ({
      id: location.id,
      name: location.name,
      slug: location.slug,
      status: location.status,
      isPrimary: location.isPrimary,
      facilityType: location.facilityType,
      contactEmail: location.contactEmail,
      contactPhone: location.contactPhone,
      websiteUrl: location.websiteUrl,
      description: location.description,
      addressLine: location.addressLine,
      county: location.county,
      cityOrTown: location.cityOrTown,
      latitude: location.latitude === null ? null : Number(location.latitude),
      longitude: location.longitude === null ? null : Number(location.longitude),
      timezone: location.timezone,
      openingPeriods: location.openingPeriods.map((period) => ({
        id: period.id,
        dayOfWeek: period.dayOfWeek,
        opensAt: minutesAfterMidnightToTime(period.opensAtMinutes),
        closesAt: minutesAfterMidnightToTime(period.closesAtMinutes),
        closesNextDay: period.closesNextDay
      })),
      services: location.services.map(({ service }) => service),
      staffMembers: location.staffMembers
    }))
  };
}
