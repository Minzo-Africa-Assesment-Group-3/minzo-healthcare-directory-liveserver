import { initContract } from "@ts-rest/core";
import { z } from "zod";

import { problemDetailsSchema } from "../../../../../shared/errors/problem-details.schema.js";
import { paginatedResponseSchema, paginationQuerySchema } from "../../../../../shared/pagination/index.js";
import { RATING_WINDOW_MONTHS } from "../../../reviews/review.policy.js";

const contract = initContract();

const optionalTrimmedText = (maximumLength: number) =>
  z.preprocess(
    (value) => (value === "" ? undefined : value),
    z.string().trim().min(2).max(maximumLength).optional()
  );

export const searchBusinessesQuerySchema = paginationQuerySchema
  .extend({
    search: optionalTrimmedText(150),
    county: optionalTrimmedText(100),
    city: optionalTrimmedText(100),
    facilityType: optionalTrimmedText(100),
    serviceId: z.preprocess((value) => (value === "" ? undefined : value), z.string().uuid().optional()),
    latitude: z.coerce.number().min(-90).max(90).optional(),
    longitude: z.coerce.number().min(-180).max(180).optional(),
    radiusKm: z.coerce.number().positive().max(200).optional(),
    sort: z.enum(["name", "newest", "distance"]).optional()
  })
  .superRefine((query, context) => {
    const proximityValues = [query.latitude, query.longitude, query.radiusKm];
    const suppliedProximityValues = proximityValues.filter((value) => value !== undefined).length;

    if (suppliedProximityValues > 0 && suppliedProximityValues < 3) {
      context.addIssue({
        code: "custom",
        message: "latitude, longitude, and radiusKm must be supplied together.",
        path: ["latitude"]
      });
    }

    if (query.sort === "distance" && suppliedProximityValues !== 3) {
      context.addIssue({
        code: "custom",
        message: "Distance sorting requires proximity coordinates.",
        path: ["sort"]
      });
    }
  });

export type SearchBusinessesQuery = z.infer<typeof searchBusinessesQuerySchema>;

const businessSearchLocationSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  facilityType: z.string().nullable(),
  addressLine: z.string().nullable(),
  county: z.string().nullable(),
  cityOrTown: z.string().nullable(),
  latitude: z.number().min(-90).max(90).nullable(),
  longitude: z.number().min(-180).max(180).nullable(),
  isPrimary: z.boolean()
});

export const businessSearchResultSchema = z.object({
  id: z.string().uuid(),
  displayName: z.string(),
  slug: z.string(),
  verificationStatus: z.enum(["UNVERIFIED", "VERIFIED"]),
  isClaimed: z.boolean(),
  isFollowedByCurrentUser: z.boolean(),
  location: businessSearchLocationSchema,
  services: z.array(
    z.object({
      id: z.string().uuid(),
      name: z.string(),
      slug: z.string()
    })
  ),
  rating: z.object({
    averageRating: z.number().min(1).max(5).nullable(),
    reviewCount: z.number().int().nonnegative(),
    ratingWindowMonths: z.literal(RATING_WINDOW_MONTHS)
  }),
  distanceKm: z.number().nonnegative().nullable()
});

export const searchBusinessesContract = contract.query({
  method: "GET",
  path: "/api/v1/businesses",
  query: searchBusinessesQuerySchema,
  strictStatusCodes: true,
  summary: "Search the public business directory",
  description:
    "Returns approved businesses with an active matching location. Text search is relevance-ranked and typo-tolerant across business, location, service, and public professional data. Supports county, city, facility type, service, and PostGIS proximity filters.",
  responses: {
    200: paginatedResponseSchema(businessSearchResultSchema),
    400: problemDetailsSchema
  },
  metadata: {
    authentication: "optional-user-access-token",
    openApiTags: ["Businesses"]
  }
});
