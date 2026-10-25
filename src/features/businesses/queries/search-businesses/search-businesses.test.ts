import request from "supertest";
import { describe, expect, it } from "vitest";

import { createApp } from "../../../../test/create-business-test-app.js";
import type { DatabaseClient } from "../../../../infrastructure/database/index.js";
import { createLogger } from "../../../../infrastructure/logging/index.js";
import { createTestHttpDependencies } from "../../../../test/create-test-http-dependencies.js";
import { createTestRouteDependencies } from "../../../../test/create-test-route-dependencies.js";
import { searchBusinessesContract, searchBusinessesQuerySchema } from "./search-businesses.contract.js";
import { createBusinessSearchWhere } from "./search-businesses.query.js";

const businessId = "6f5c79f2-787c-44f0-a47f-92de621dd97a";
const primaryLocationId = "9b2c7aaa-fb70-438c-a863-a31634985683";
const nearbyLocationId = "8ca37e94-8469-4df9-a71c-134b122c82e5";
const serviceId = "fa406b35-1f88-4d20-8248-5273585d3b0e";

function isParameterizedSql(value: unknown): value is {
  sql: string;
  values: unknown[];
} {
  return (
    typeof value === "object" &&
    value !== null &&
    "sql" in value &&
    typeof value.sql === "string" &&
    "values" in value &&
    Array.isArray(value.values)
  );
}

function businessRecord() {
  return {
    id: businessId,
    displayName: "Monrovia Family Clinic",
    slug: "monrovia-family-clinic",
    verificationStatus: "VERIFIED",
    _count: { memberships: 0 },
    locations: [
      {
        id: primaryLocationId,
        name: "Main Clinic",
        facilityType: "Clinic",
        addressLine: "Broad Street",
        county: "Montserrado",
        cityOrTown: "Monrovia",
        latitude: 6.3156,
        longitude: -10.8074,
        isPrimary: true,
        services: [
          {
            service: {
              id: serviceId,
              name: "General Practice",
              slug: "general-practice"
            }
          }
        ]
      },
      {
        id: nearbyLocationId,
        name: "Sinkor Branch",
        facilityType: "Clinic",
        addressLine: "Tubman Boulevard",
        county: "Montserrado",
        cityOrTown: "Sinkor",
        latitude: 6.29,
        longitude: -10.78,
        isPrimary: false,
        services: []
      }
    ]
  };
}

function createTestApp(database: DatabaseClient) {
  const routes = createTestRouteDependencies();
  routes.businesses.database = database;

  return createApp({
    ...createTestHttpDependencies(),
    logger: createLogger({ environment: "test", level: "silent" }),
    routes
  });
}

describe("business search contract", () => {
  it("applies pagination defaults", () => {
    expect(searchBusinessesQuerySchema.parse({})).toEqual({
      pageNumber: 1,
      pageSize: 20
    });
  });

  it("requires complete proximity coordinates", () => {
    expect(() =>
      searchBusinessesQuerySchema.parse({
        latitude: 6.3,
        longitude: -10.8
      })
    ).toThrow("latitude, longitude, and radiusKm must be supplied together.");
  });

  it("requires proximity coordinates for distance sorting", () => {
    expect(() => searchBusinessesQuerySchema.parse({ sort: "distance" })).toThrow(
      "Distance sorting requires proximity coordinates."
    );
  });

  it("builds approved-business and active-location filters", () => {
    const query = searchBusinessesQuerySchema.parse({
      search: "clinic",
      county: "Montserrado",
      city: "Monrovia",
      facilityType: "Clinic",
      serviceId
    });

    expect(createBusinessSearchWhere(query)).toMatchObject({
      status: "APPROVED",
      locations: {
        some: {
          status: "ACTIVE",
          county: {
            equals: "Montserrado",
            mode: "insensitive"
          },
          cityOrTown: {
            equals: "Monrovia",
            mode: "insensitive"
          },
          facilityType: {
            equals: "Clinic",
            mode: "insensitive"
          },
          services: {
            some: { serviceId }
          }
        }
      }
    });
  });
});

describe("public business search endpoint", () => {
  it("filters and paginates public business cards without authentication", async () => {
    let rawSearchQuery: unknown;
    let findManyQuery: unknown;
    const transaction = {
      async $queryRaw(query: unknown) {
        rawSearchQuery = query;

        return [
          {
            businessId,
            totalCount: 3n
          }
        ];
      },
      business: {
        async findMany(args: unknown) {
          findManyQuery = args;
          return [businessRecord()];
        }
      },
      review: {
        async groupBy() {
          return [
            {
              businessId,
              _avg: { stars: 4.5 },
              _count: { _all: 8 }
            }
          ];
        }
      }
    };
    const database = {
      async $transaction(callback: (client: typeof transaction) => Promise<unknown>) {
        return callback(transaction);
      }
    } as unknown as DatabaseClient;
    const app = createTestApp(database);

    const response = await request(app).get(
      "/api/v1/businesses?search=clinic&county=Montserrado&facilityType=Clinic&pageSize=1"
    );
    const body = searchBusinessesContract.responses[200].parse(response.body);

    expect(response.status).toBe(200);
    expect(body.data).toMatchObject([
      {
        id: businessId,
        isClaimed: false,
        location: {
          id: primaryLocationId,
          county: "Montserrado"
        },
        rating: {
          averageRating: 4.5,
          reviewCount: 8,
          ratingWindowMonths: 12
        },
        distanceKm: null
      }
    ]);
    expect(body.pagination.nextPageUrl).toBe(
      "/api/v1/businesses?search=clinic&county=Montserrado&facilityType=Clinic&pageSize=1&pageNumber=2"
    );
    expect(isParameterizedSql(rawSearchQuery)).toBe(true);

    if (!isParameterizedSql(rawSearchQuery)) {
      throw new Error("Expected the endpoint to execute parameterized SQL.");
    }

    expect(rawSearchQuery.sql).toContain("websearch_to_tsquery");
    expect(rawSearchQuery.values).toContain("clinic");
    expect(rawSearchQuery.values).toContain("Clinic");
    expect(findManyQuery).toMatchObject({
      where: {
        id: { in: [businessId] },
        status: "APPROVED"
      }
    });
  });

  it("uses the nearest location for a proximity result", async () => {
    let rawQueryCalled = false;
    const transaction = {
      async $queryRaw() {
        rawQueryCalled = true;

        return [
          {
            businessId,
            locationId: nearbyLocationId,
            distanceMeters: 1_234.5,
            totalCount: 1n
          }
        ];
      },
      business: {
        async findMany() {
          return [businessRecord()];
        }
      },
      review: {
        async groupBy() {
          return [];
        }
      }
    };
    const database = {
      async $transaction(callback: (client: typeof transaction) => Promise<unknown>) {
        return callback(transaction);
      }
    } as unknown as DatabaseClient;
    const app = createTestApp(database);

    const response = await request(app).get(
      "/api/v1/businesses?latitude=6.29&longitude=-10.78&radiusKm=10&sort=distance"
    );
    const body = searchBusinessesContract.responses[200].parse(response.body);

    expect(response.status).toBe(200);
    expect(rawQueryCalled).toBe(true);
    expect(body.data[0]).toMatchObject({
      id: businessId,
      location: {
        id: nearbyLocationId,
        name: "Sinkor Branch"
      },
      rating: {
        averageRating: null,
        reviewCount: 0
      },
      distanceKm: 1.23
    });
  });

  it("returns Problem Details for partial proximity input", async () => {
    const app = createTestApp({} as DatabaseClient);

    const response = await request(app).get("/api/v1/businesses?latitude=6.29&longitude=-10.78");

    expect(response.status).toBe(400);
    expect(response.body).toMatchObject({
      code: "request_validation_failed",
      status: 400
    });
  });
});
