import request from "supertest";
import { describe, expect, it } from "vitest";

import { createApp } from "../../app.js";
import type { DatabaseClient } from "../../infrastructure/database/index.js";
import { createLogger } from "../../infrastructure/logging/index.js";
import { createTestHttpDependencies } from "../../test/create-test-http-dependencies.js";
import { createTestRouteDependencies } from "../../test/create-test-route-dependencies.js";
import { searchCountiesContract } from "./queries/search-counties/search-counties.contract.js";

const countyId = "6f5c79f2-787c-44f0-a47f-92de621dd97a";

describe("county search contract", () => {
  it("allows an omitted limit for mode-dependent defaults", () => {
    expect(searchCountiesContract.query.parse({ search: "mont" })).toEqual({
      search: "mont"
    });
  });

  it("rejects searches shorter than two characters", () => {
    expect(() => searchCountiesContract.query.parse({ search: "m" })).toThrow();
  });
});

describe("public county search endpoint", () => {
  it.each([
    ["", undefined, undefined],
    ["?search=", undefined, undefined],
    ["?search=%20%20", undefined, undefined],
    ["?limit=5", undefined, 5],
    ["?search=mont", "mont", 10]
  ])("supports listing and search defaults for %s", async (suffix, search, take) => {
    let findManyQuery: unknown;
    const database = {
      county: {
        async findMany(args: unknown) {
          findManyQuery = args;
          return [{ id: countyId, name: "Montserrado", slug: "montserrado" }];
        }
      }
    } as unknown as DatabaseClient;
    const routes = createTestRouteDependencies();
    routes.counties.database = database;
    const app = createApp({
      ...createTestHttpDependencies(),
      logger: createLogger({ environment: "test", level: "silent" }),
      routes
    });

    const response = await request(app).get(`/api/v1/counties${suffix}`);

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      data: [{ id: countyId, name: "Montserrado", slug: "montserrado" }]
    });
    expect(findManyQuery).toEqual({
      where: {
        isActive: true,
        ...(search ? { name: { contains: search, mode: "insensitive" } } : {})
      },
      orderBy: [{ name: "asc" }, { id: "asc" }],
      ...(take !== undefined ? { take } : {}),
      select: { id: true, name: true, slug: true }
    });
  });

  it("returns active suggestions without authentication", async () => {
    let findManyQuery: unknown;
    const database = {
      county: {
        async findMany(args: unknown) {
          findManyQuery = args;

          return [
            {
              id: countyId,
              name: "Montserrado",
              slug: "montserrado"
            }
          ];
        }
      }
    } as unknown as DatabaseClient;
    const routes = createTestRouteDependencies();
    routes.counties.database = database;
    const app = createApp({
      ...createTestHttpDependencies(),
      logger: createLogger({ environment: "test", level: "silent" }),
      routes
    });

    const response = await request(app).get("/api/v1/counties?search=mont&limit=5");

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      data: [
        {
          id: countyId,
          name: "Montserrado",
          slug: "montserrado"
        }
      ]
    });
    expect(findManyQuery).toMatchObject({
      take: 5,
      where: {
        isActive: true,
        name: { contains: "mont", mode: "insensitive" }
      }
    });
  });

  it("returns Problem Details for an invalid search", async () => {
    const app = createApp({
      ...createTestHttpDependencies(),
      logger: createLogger({ environment: "test", level: "silent" }),
      routes: createTestRouteDependencies()
    });

    const response = await request(app).get("/api/v1/counties?search=m");

    expect(response.status).toBe(400);
    expect(response.body).toMatchObject({
      code: "request_validation_failed",
      status: 400
    });
  });
});
