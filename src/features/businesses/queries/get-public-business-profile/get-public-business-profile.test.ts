import request from "supertest";
import { describe, expect, it } from "vitest";
import { z } from "zod";

import { createApp } from "../../../../test/create-business-test-app.js";
import type { DatabaseClient } from "../../../../infrastructure/database/index.js";
import { createLogger } from "../../../../infrastructure/logging/index.js";
import type { ObjectStorage } from "../../../../infrastructure/storage/index.js";
import { createTestHttpDependencies } from "../../../../test/create-test-http-dependencies.js";
import { createTestRouteDependencies } from "../../../../test/create-test-route-dependencies.js";
import { getPublicBusinessProfileContract } from "./get-public-business-profile.contract.js";

const businessId = "6f5c79f2-787c-44f0-a47f-92de621dd97a";
const locationId = "9b2c7aaa-fb70-438c-a863-a31634985683";
const openingPeriodId = "8ca37e94-8469-4df9-a71c-134b122c82e5";
const serviceId = "fa406b35-1f88-4d20-8248-5273585d3b0e";
const professionalId = "5c94c9d4-67a1-4dcb-8fea-eed1dd30dd66";
const mediaId = "01ac73ce-a265-4503-af3a-67fdfbc7668c";

function createTestApp(database: DatabaseClient, objectStorage?: ObjectStorage) {
  const routes = createTestRouteDependencies();
  routes.businesses.database = database;

  if (objectStorage) {
    routes.businesses.objectStorage = objectStorage;
  }

  return createApp({
    ...createTestHttpDependencies(),
    logger: createLogger({ environment: "test", level: "silent" }),
    routes
  });
}

describe("public business profile endpoint", () => {
  it("returns an approved business's public profile", async () => {
    let businessQuery: unknown;
    let ratingQuery: unknown;
    const business = {
      id: businessId,
      displayName: "Monrovia Family Clinic",
      legalName: "Monrovia Family Clinic Incorporated",
      slug: "monrovia-family-clinic",
      verificationStatus: "VERIFIED",
      _count: { memberships: 1 },
      approvedAt: new Date("2026-09-01T10:00:00.000Z"),
      media: [
        {
          id: mediaId,
          bucket: "business-media",
          objectKey: `business-media/${businessId}/clinic.jpg`,
          altText: "Front of Monrovia Family Clinic",
          isCover: true,
          sortOrder: 0
        }
      ],
      locations: [
        {
          id: locationId,
          name: "Main Clinic",
          slug: "main-clinic",
          facilityType: "Clinic",
          contactEmail: "hello@example.com",
          contactPhone: "+231770000000",
          websiteUrl: "https://example.com",
          description: "Primary and outpatient care.",
          addressLine: "Broad Street",
          county: "Montserrado",
          cityOrTown: "Monrovia",
          latitude: 6.3156,
          longitude: -10.8074,
          timezone: "Africa/Monrovia",
          isPrimary: true,
          openingPeriods: [
            {
              id: openingPeriodId,
              dayOfWeek: "MONDAY",
              opensAtMinutes: 480,
              closesAtMinutes: 1_020,
              closesNextDay: false
            }
          ],
          services: [
            {
              service: {
                id: serviceId,
                name: "General Practice",
                slug: "general-practice"
              }
            }
          ],
          staffMembers: [
            {
              id: professionalId,
              displayName: "Dr. Jane Doe",
              profession: "GENERAL_PRACTITIONER",
              professionalTitle: "Medical Doctor",
              yearsExperience: 8,
              verificationStatus: "VERIFIED"
            }
          ]
        }
      ]
    };
    const transaction = {
      business: {
        async findFirst(args: unknown) {
          businessQuery = args;
          return business;
        }
      },
      review: {
        async aggregate(args: unknown) {
          ratingQuery = args;
          return {
            _avg: { stars: 4.666_666 },
            _count: { _all: 3 }
          };
        }
      }
    };
    const database = {
      async $transaction(callback: (client: typeof transaction) => Promise<unknown>) {
        return callback(transaction);
      }
    } as unknown as DatabaseClient;
    const objectStorage = {
      async createSignedUploadAuthorization() {
        throw new Error("Upload authorization was not expected.");
      },
      async createSignedDownloadAuthorization() {
        return { signedUrl: "https://storage.example.com/clinic.jpg" };
      },
      async getObjectInfo() {
        throw new Error("Object metadata was not expected.");
      },
      async objectExists() {
        throw new Error("Object existence check was not expected.");
      },
      async downloadObject() {
        throw new Error("Object download was not expected.");
      },
      async removeObject() {
        throw new Error("Object removal was not expected.");
      }
    } satisfies ObjectStorage;
    const app = createTestApp(database, objectStorage);

    const response = await request(app).get("/api/v1/businesses/monrovia-family-clinic");
    const body = getPublicBusinessProfileContract.responses[200].parse(response.body);

    expect(response.status).toBe(200);
    expect(body).toMatchObject({
      id: businessId,
      displayName: "Monrovia Family Clinic",
      isClaimed: true,
      rating: {
        averageRating: 4.67,
        reviewCount: 3,
        ratingWindowMonths: 12
      },
      gallery: {
        coverImage: {
          id: mediaId,
          url: "https://storage.example.com/clinic.jpg",
          isCover: true
        },
        images: [
          {
            id: mediaId,
            url: "https://storage.example.com/clinic.jpg"
          }
        ]
      },
      locations: [
        {
          id: locationId,
          latitude: 6.3156,
          longitude: -10.8074,
          openingPeriods: [
            {
              dayOfWeek: "MONDAY",
              opensAt: "8:00 AM",
              closesAt: "5:00 PM",
              closesNextDay: false
            }
          ],
          services: [
            {
              id: serviceId,
              name: "General Practice"
            }
          ],
          professionals: [
            {
              id: professionalId,
              displayName: "Dr. Jane Doe"
            }
          ]
        }
      ]
    });
    expect(body).not.toHaveProperty("registrationNumber");
    expect(body).not.toHaveProperty("memberships");
    expect(body.locations[0]?.professionals[0]).not.toHaveProperty("email");
    expect(body.locations[0]?.professionals[0]).not.toHaveProperty("phone");
    expect(businessQuery).toMatchObject({
      where: {
        slug: "monrovia-family-clinic",
        status: "APPROVED"
      },
      select: {
        _count: {
          select: { memberships: true }
        },
        media: {
          where: { status: "APPROVED" }
        },
        locations: {
          where: { status: "ACTIVE" },
          select: {
            staffMembers: {
              where: { isPublic: true }
            }
          }
        }
      }
    });
    const parsedRatingQuery = z
      .object({
        where: z.object({
          businessId: z.string(),
          status: z.literal("PUBLISHED"),
          submittedAt: z.object({ gte: z.date() })
        })
      })
      .parse(ratingQuery);

    expect(parsedRatingQuery.where.businessId).toBe(businessId);
  });

  it("returns 404 when the slug has no approved business", async () => {
    const transaction = {
      business: {
        async findFirst() {
          return null;
        }
      },
      review: {
        async aggregate() {
          throw new Error("The rating query should not run.");
        }
      }
    };
    const database = {
      async $transaction(callback: (client: typeof transaction) => Promise<unknown>) {
        return callback(transaction);
      }
    } as unknown as DatabaseClient;
    const app = createTestApp(database);

    const response = await request(app).get("/api/v1/businesses/not-public");

    expect(response.status).toBe(404);
    expect(response.body).toMatchObject({
      code: "business_not_found",
      status: 404
    });
  });
});
