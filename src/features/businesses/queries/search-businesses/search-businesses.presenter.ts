import { RATING_WINDOW_MONTHS } from "../../../reviews/review.policy.js";
import type { SearchBusinessesQuery } from "./search-businesses.contract.js";
import type { BusinessSearchResultRecord } from "./search-businesses.select.js";

interface BusinessSearchRating {
  averageRating: number | null;
  reviewCount: number;
}

interface BusinessSearchPresentationOptions {
  distanceMeters?: number | undefined;
  nearestLocationId?: string | undefined;
  query: SearchBusinessesQuery;
  rating: BusinessSearchRating;
}

type SearchLocation = BusinessSearchResultRecord["locations"][number];

function normalizedEquals(
  value: string | null,
  expected: string | undefined,
): boolean {
  return expected === undefined ||
    value?.localeCompare(expected, undefined, {
      sensitivity: "accent",
    }) === 0;
}

function locationMatchesFilters(
  location: SearchLocation,
  query: SearchBusinessesQuery,
): boolean {
  return normalizedEquals(location.county, query.county) &&
    normalizedEquals(location.cityOrTown, query.city) &&
    (query.serviceId === undefined ||
      location.services.some(
        ({ service }) => service.id === query.serviceId,
      ));
}

function selectRepresentativeLocation(
  business: BusinessSearchResultRecord,
  query: SearchBusinessesQuery,
  nearestLocationId?: string,
): SearchLocation {
  const nearestLocation = nearestLocationId
    ? business.locations.find(
        (location) => location.id === nearestLocationId,
      )
    : undefined;
  const filteredLocation = business.locations.find((location) =>
    locationMatchesFilters(location, query),
  );
  const location = nearestLocation ?? filteredLocation ?? business.locations[0];

  if (!location) {
    throw new Error(
      `Search result business ${business.id} has no active location.`,
    );
  }

  return location;
}

function coordinateToNumber(
  coordinate: SearchLocation["latitude"],
): number | null {
  return coordinate === null ? null : Number(coordinate);
}

export function presentBusinessSearchResult(
  business: BusinessSearchResultRecord,
  options: BusinessSearchPresentationOptions,
) {
  const location = selectRepresentativeLocation(
    business,
    options.query,
    options.nearestLocationId,
  );

  return {
    id: business.id,
    displayName: business.displayName,
    slug: business.slug,
    verificationStatus: business.verificationStatus,
    isClaimed: business._count.memberships > 0,
    location: {
      id: location.id,
      name: location.name,
      facilityType: location.facilityType,
      addressLine: location.addressLine,
      county: location.county,
      cityOrTown: location.cityOrTown,
      latitude: coordinateToNumber(location.latitude),
      longitude: coordinateToNumber(location.longitude),
      isPrimary: location.isPrimary,
    },
    services: location.services.map(({ service }) => service),
    rating: {
      ...options.rating,
      ratingWindowMonths:
        RATING_WINDOW_MONTHS as typeof RATING_WINDOW_MONTHS,
    },
    distanceKm: options.distanceMeters === undefined
      ? null
      : Math.round(options.distanceMeters / 10) / 100,
  };
}
