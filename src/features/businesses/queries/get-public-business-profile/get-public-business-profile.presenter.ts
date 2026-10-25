import { RATING_WINDOW_MONTHS } from "../../../reviews/review.policy.js";
import type { PublicBusinessProfileRecord } from "./get-public-business-profile.select.js";

interface PublicBusinessRating {
  averageRating: number | null;
  reviewCount: number;
}

export interface PublicBusinessMediaUrl {
  id: string;
  url: string;
}

function coordinateToNumber(
  coordinate: PublicBusinessProfileRecord["locations"][number]["latitude"]
): number | null {
  return coordinate === null ? null : Number(coordinate);
}

function minutesAfterMidnightToTime(minutes: number): string {
  const hours24 = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  const period = hours24 < 12 ? "AM" : "PM";
  const hours12 = hours24 % 12 || 12;

  return `${hours12}:${String(remainingMinutes).padStart(2, "0")} ${period}`;
}

export function presentPublicBusinessProfile(
  business: PublicBusinessProfileRecord,
  rating: PublicBusinessRating,
  mediaUrls: readonly PublicBusinessMediaUrl[]
) {
  const urlByMediaId = new Map(mediaUrls.map(({ id, url }) => [id, url] as const));
  const images = business.media.map((media) => ({
    id: media.id,
    url: urlByMediaId.get(media.id)!,
    altText: media.altText,
    isCover: media.isCover,
    sortOrder: media.sortOrder
  }));

  return {
    id: business.id,
    displayName: business.displayName,
    legalName: business.legalName,
    slug: business.slug,
    verificationStatus: business.verificationStatus,
    isClaimed: business._count.memberships > 0,
    approvedAt: business.approvedAt?.toISOString() ?? null,
    rating: {
      ...rating,
      ratingWindowMonths: RATING_WINDOW_MONTHS as typeof RATING_WINDOW_MONTHS
    },
    gallery: {
      coverImage: images.find(({ isCover }) => isCover) ?? null,
      images
    },
    locations: business.locations.map((location) => ({
      id: location.id,
      name: location.name,
      slug: location.slug,
      facilityType: location.facilityType,
      contactEmail: location.contactEmail,
      contactPhone: location.contactPhone,
      websiteUrl: location.websiteUrl,
      description: location.description,
      addressLine: location.addressLine,
      county: location.county,
      cityOrTown: location.cityOrTown,
      latitude: coordinateToNumber(location.latitude),
      longitude: coordinateToNumber(location.longitude),
      timezone: location.timezone,
      isPrimary: location.isPrimary,
      openingPeriods: location.openingPeriods.map((period) => ({
        id: period.id,
        dayOfWeek: period.dayOfWeek,
        opensAt: minutesAfterMidnightToTime(period.opensAtMinutes),
        closesAt: minutesAfterMidnightToTime(period.closesAtMinutes),
        closesNextDay: period.closesNextDay
      })),
      services: location.services.map(({ service }) => service),
      professionals: location.staffMembers
    }))
  };
}
