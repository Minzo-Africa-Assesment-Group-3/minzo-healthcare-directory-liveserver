import { initContract } from "@ts-rest/core";
import { z } from "zod";

import { problemDetailsSchema } from "../../../../shared/errors/problem-details.schema.js";
import { businessServiceNamesSchema } from "../../../businesses/business-service.js";

const contract = initContract();

const businessLocationSchema = z
  .object({
    addressLine: z.string().trim().min(3).max(255),
    county: z.string().trim().min(2).max(100),
    cityOrTown: z.string().trim().min(2).max(100),
    latitude: z.number().min(-90).max(90).optional(),
    longitude: z.number().min(-180).max(180).optional()
  })
  .refine(({ latitude, longitude }) => (latitude === undefined) === (longitude === undefined), {
    message: "Latitude and longitude must be provided together.",
    path: ["latitude"]
  });

const dayOfWeekSchema = z.enum([
  "MONDAY",
  "TUESDAY",
  "WEDNESDAY",
  "THURSDAY",
  "FRIDAY",
  "SATURDAY",
  "SUNDAY"
]);

const localTimeSchema = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Time must use HH:mm format.");

const openingPeriodSchema = z.object({
  opensAt: localTimeSchema,
  closesAt: localTimeSchema,
  closesNextDay: z.boolean().default(false)
});

function timeToMinutes(time: string): number {
  const [hours = 0, minutes = 0] = time.split(":").map(Number);

  return hours * 60 + minutes;
}

function isValidTimeZone(timezone: string): boolean {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: timezone }).format();
    return true;
  } catch {
    return false;
  }
}

const dailyOpeningHoursSchema = z
  .object({
    dayOfWeek: dayOfWeekSchema,
    isClosed: z.boolean().default(false),
    is24Hours: z.boolean().default(false),
    periods: z.array(openingPeriodSchema).max(4).default([])
  })
  .superRefine((schedule, context) => {
    if (schedule.isClosed && schedule.is24Hours) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "A day cannot be both closed and open for 24 hours."
      });
    }

    if ((schedule.isClosed || schedule.is24Hours) && schedule.periods.length) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Closed and 24-hour days must not include time periods.",
        path: ["periods"]
      });
    }

    if (!schedule.isClosed && !schedule.is24Hours && !schedule.periods.length) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "An operating day must include at least one time period.",
        path: ["periods"]
      });
    }

    const periods = schedule.periods
      .map((period, index) => {
        const opensAt = timeToMinutes(period.opensAt);
        const closesAt = timeToMinutes(period.closesAt) + (period.closesNextDay ? 24 * 60 : 0);

        if (closesAt <= opensAt) {
          context.addIssue({
            code: z.ZodIssueCode.custom,
            message: "Closing time must be after opening time.",
            path: ["periods", index, "closesAt"]
          });
        }

        return { closesAt, index, opensAt };
      })
      .sort((left, right) => left.opensAt - right.opensAt);

    for (let index = 1; index < periods.length; index += 1) {
      const previousPeriod = periods[index - 1];
      const currentPeriod = periods[index];

      if (!previousPeriod || !currentPeriod) {
        continue;
      }

      if (currentPeriod.opensAt < previousPeriod.closesAt) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Opening periods for the same day must not overlap.",
          path: ["periods", currentPeriod.index]
        });
      }
    }
  });

const weeklyOpeningHoursSchema = z
  .array(dailyOpeningHoursSchema)
  .max(7)
  .refine(
    (days) => new Set(days.map((day) => day.dayOfWeek)).size === days.length,
    "Opening hours must not contain duplicate days."
  )
  .optional();

const businessStaffMemberSchema = z.object({
  displayName: z.string().trim().min(2).max(100),
  profession: z.enum([
    "GENERAL_PRACTITIONER",
    "DENTIST",
    "NURSE",
    "PHARMACIST",
    "PEDIATRICIAN",
    "OPHTHALMOLOGIST",
    "OTHER"
  ]),
  professionalTitle: z.string().trim().min(2).max(100).optional(),
  phone: z.string().trim().min(7).max(30).optional(),
  email: z.string().trim().email().max(320).optional(),
  yearsExperience: z.number().int().min(0).max(100).optional(),
  isPublic: z.boolean().default(true)
});

export const registerBusinessBodySchema = z.object({
  user: z.object({
    email: z.string().trim().email().max(320),
    password: z.string().min(12).max(128),
    displayName: z.string().trim().min(2).max(100),
    phone: z.string().trim().min(7).max(30).optional()
  }),
  business: z
    .object({
      displayName: z.string().trim().min(2).max(200),
      legalName: z.string().trim().min(2).max(200),
      registrationNumber: z.string().trim().min(2).max(100).optional(),
      membershipRole: z.enum(["OWNER", "MANAGER"])
    })
    .strict(),
  primaryLocation: z.object({
    name: z.string().trim().min(2).max(200),
    facilityType: z.string().trim().min(2).max(100),
    contactEmail: z.string().trim().email().max(320).optional(),
    contactPhone: z.string().trim().min(7).max(30).optional(),
    websiteUrl: z.string().trim().url().max(500).optional(),
    description: z.string().trim().min(10).max(2_000).optional(),
    timezone: z
      .string()
      .trim()
      .min(1)
      .max(100)
      .refine(isValidTimeZone, "Timezone must be a valid IANA timezone.")
      .default("Africa/Monrovia"),
    location: businessLocationSchema,
    openingHours: weeklyOpeningHoursSchema,
    services: businessServiceNamesSchema.optional(),
    staffMembers: z.array(businessStaffMemberSchema).max(100).optional()
  })
});

export type RegisterBusinessBody = z.infer<typeof registerBusinessBodySchema>;

export const registerBusinessContract = contract.mutation({
  method: "POST",
  path: "/api/v1/auth/register/business",
  strictStatusCodes: true,
  summary: "Register a user and business",
  description:
    "Creates a public user, submitted business, draft primary location, business membership, and email verification challenge in one database transaction. After verification and login, a member can upload the private registration document through the business-registration document endpoints.",
  body: registerBusinessBodySchema,
  responses: {
    201: z.object({
      message: z.string(),
      user: z.object({
        id: z.string().uuid(),
        email: z.string().email(),
        displayName: z.string(),
        status: z.literal("PENDING_VERIFICATION")
      }),
      business: z.object({
        id: z.string().uuid(),
        displayName: z.string(),
        legalName: z.string(),
        slug: z.string(),
        status: z.literal("PENDING_APPROVAL"),
        membershipRole: z.enum(["OWNER", "MANAGER"])
      }),
      primaryLocation: z.object({
        id: z.string().uuid(),
        name: z.string(),
        slug: z.string(),
        status: z.literal("DRAFT"),
        isPrimary: z.literal(true)
      })
    }),
    409: problemDetailsSchema,
    503: problemDetailsSchema
  },
  metadata: {
    authentication: "public",
    openApiTags: ["Authentication"]
  }
});
