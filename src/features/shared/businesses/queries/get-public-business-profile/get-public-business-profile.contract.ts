import { initContract } from "@ts-rest/core";
import { z } from "zod";

import { problemDetailsSchema } from "../../../../../shared/errors/problem-details.schema.js";
import { RATING_WINDOW_MONTHS } from "../../../reviews/review.policy.js";
import { publicBusinessMediaSchema } from "../../../../business/media/business-media.schemas.js";

const contract = initContract();

const openingPeriodSchema = z.object({
  id: z.string().uuid(),
  dayOfWeek: z.enum(["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY", "SUNDAY"]),
  opensAt: z.string().regex(/^(?:[1-9]|1[0-2]):[0-5]\d (?:AM|PM)$/),
  closesAt: z.string().regex(/^(?:[1-9]|1[0-2]):[0-5]\d (?:AM|PM)$/),
  closesNextDay: z.boolean()
});

const serviceSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  slug: z.string()
});

const professionalSchema = z.object({
  id: z.string().uuid(),
  displayName: z.string(),
  profession: z.enum([
    "GENERAL_PRACTITIONER",
    "DENTIST",
    "NURSE",
    "PHARMACIST",
    "PEDIATRICIAN",
    "OPHTHALMOLOGIST",
    "OTHER"
  ]),
  professionalTitle: z.string().nullable(),
  yearsExperience: z.number().int().nonnegative().nullable(),
  verificationStatus: z.enum(["UNVERIFIED", "VERIFIED"])
});

const locationSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  slug: z.string(),
  facilityType: z.string().nullable(),
  contactEmail: z.string().nullable(),
  contactPhone: z.string().nullable(),
  websiteUrl: z.string().nullable(),
  description: z.string().nullable(),
  addressLine: z.string().nullable(),
  county: z.string().nullable(),
  cityOrTown: z.string().nullable(),
  latitude: z.number().min(-90).max(90).nullable(),
  longitude: z.number().min(-180).max(180).nullable(),
  timezone: z.string(),
  isPrimary: z.boolean(),
  openingPeriods: z.array(openingPeriodSchema),
  services: z.array(serviceSchema),
  professionals: z.array(professionalSchema)
});

export const publicBusinessProfileSchema = z.object({
  id: z.string().uuid(),
  displayName: z.string(),
  legalName: z.string().nullable(),
  slug: z.string(),
  verificationStatus: z.enum(["UNVERIFIED", "VERIFIED"]),
  isClaimed: z.boolean(),
  approvedAt: z.string().datetime().nullable(),
  rating: z.object({
    averageRating: z.number().min(1).max(5).nullable(),
    reviewCount: z.number().int().nonnegative(),
    ratingWindowMonths: z.literal(RATING_WINDOW_MONTHS)
  }),
  gallery: z.object({
    coverImage: publicBusinessMediaSchema.nullable(),
    images: z.array(publicBusinessMediaSchema)
  }),
  locations: z.array(locationSchema)
});

export const getPublicBusinessProfileContract = contract.query({
  method: "GET",
  path: "/api/v1/businesses/:slug",
  pathParams: z.object({
    slug: z.string().trim().min(1).max(220)
  }),
  strictStatusCodes: true,
  summary: "Get a public business profile",
  description:
    "Returns an approved business with its approved gallery, active locations, opening periods, services, public professionals, and current aggregate rating.",
  responses: {
    200: publicBusinessProfileSchema,
    400: problemDetailsSchema,
    404: problemDetailsSchema,
    503: problemDetailsSchema
  },
  metadata: {
    authentication: "public",
    openApiTags: ["Businesses"]
  }
});
