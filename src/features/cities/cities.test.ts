import request from "supertest";
import { describe, expect, it } from "vitest";

import { createApp } from "../../app.js";
import type { DatabaseClient } from "../../infrastructure/database/index.js";
import { createLogger } from "../../infrastructure/logging/index.js";
import { createTestHttpDependencies } from "../../test/create-test-http-dependencies.js";
import { createTestRouteDependencies } from "../../test/create-test-route-dependencies.js";
import { searchCitiesContract } from "./queries/search-cities/search-cities.contract.js";

const countyId = "6f5c79f2-787c-44f0-a47f-92de621dd97a";
const cityId = "9b2c7aaa-fb70-438c-a863-a31634985683";

describe("city search contract", () => {
  it("applies the default autocomplete result limit", () => {
    expect(
      searchCitiesContract.query.parse({
        countyId,
        search: "mon"
      })
    ).toEqual({
      countyId,
      search: "mon",
      limit: 10
    });
  });

  it("requires a county and at least two search characters", () => {
    expect(() => searchCitiesContract.query.parse({ search: "mon" })).toThrow();
    expect(() => searchCitiesContract.query.parse({ countyId, search: "m" })).toThrow();
  });
});

describe("public city search endpoint", () => {
  it("returns suggestions from the selected active county", async () => {
    let findManyQuery: unknown;
    const database = {
      city: {
        async findMany(args: unknown) {
          findManyQuery = args;

          return [
            {
              id: cityId,
              countyId,
              name: "Monrovia",
              slug: "monrovia"
            }
          ];
        }
      }
    } as unknown as DatabaseClient;
    const routes = createTestRouteDependencies();
    routes.cities.database = database;
    const app = createApp({
      ...createTestHttpDependencies(),
      logger: createLogger({ environment: "test", level: "silent" }),
      routes
    });

    const response = await request(app).get(`/api/v1/cities?countyId=${countyId}&search=mon&limit=5`);

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      data: [
        {
          id: cityId,
          countyId,
          name: "Monrovia",
          slug: "monrovia"
        }
      ]
    });
    expect(findManyQuery).toMatchObject({
      take: 5,
      where: {
        countyId,
        county: { isActive: true },
        isActive: true,
        name: { contains: "mon", mode: "insensitive" }
      }
    });
  });

  it("returns Problem Details when countyId is missing", async () => {
    const app = createApp({
      ...createTestHttpDependencies(),
      logger: createLogger({ environment: "test", level: "silent" }),
      routes: createTestRouteDependencies()
    });

    const response = await request(app).get("/api/v1/cities?search=mon");

    expect(response.status).toBe(400);
    expect(response.body).toMatchObject({
      code: "request_validation_failed",
      status: 400
    });
  });
});
