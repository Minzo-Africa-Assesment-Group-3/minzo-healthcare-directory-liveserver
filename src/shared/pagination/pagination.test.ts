import { describe, expect, it } from "vitest";
import { z } from "zod";

import {
  createPaginatedResponse,
  paginatedResponseSchema,
  paginationQuerySchema,
} from "./index.js";

describe("paginationQuerySchema", () => {
  it("applies defaults and coerces URL query strings", () => {
    expect(paginationQuerySchema.parse({})).toEqual({
      pageNumber: 1,
      pageSize: 20,
    });

    expect(
      paginationQuerySchema.parse({
        pageNumber: "2",
        pageSize: "50",
      }),
    ).toEqual({
      pageNumber: 2,
      pageSize: 50,
    });
  });

  it("rejects invalid values and page sizes above the limit", () => {
    expect(() =>
      paginationQuerySchema.parse({ pageNumber: 0 }),
    ).toThrow();
    expect(() =>
      paginationQuerySchema.parse({ pageSize: 101 }),
    ).toThrow();
  });
});

describe("createPaginatedResponse", () => {
  it("calculates metadata and preserves filters in navigation URLs", () => {
    const response = createPaginatedResponse({
      data: [{ id: 21 }],
      totalItems: 45,
      pageNumber: 2,
      pageSize: 20,
      requestUrl:
        "/api/v1/users?status=active&sort=name&pageNumber=2&pageSize=20",
    });

    expect(response).toEqual({
      data: [{ id: 21 }],
      pagination: {
        totalItems: 45,
        totalPages: 3,
        pageNumber: 2,
        pageSize: 20,
        hasNextPage: true,
        hasPreviousPage: true,
        nextPageUrl:
          "/api/v1/users?status=active&sort=name&pageNumber=3&pageSize=20",
        previousPageUrl:
          "/api/v1/users?status=active&sort=name&pageNumber=1&pageSize=20",
      },
    });
  });

  it("uses null URLs when no next or previous page exists", () => {
    const response = createPaginatedResponse({
      data: [],
      totalItems: 0,
      pageNumber: 1,
      pageSize: 20,
      requestUrl: "/api/v1/users",
    });

    expect(response.pagination).toMatchObject({
      totalPages: 0,
      hasNextPage: false,
      hasPreviousPage: false,
      nextPageUrl: null,
      previousPageUrl: null,
    });
  });

  it("produces responses accepted by the reusable schema", () => {
    const schema = paginatedResponseSchema(
      z.object({ id: z.number().int().positive() }),
    );
    const response = createPaginatedResponse({
      data: [{ id: 1 }],
      totalItems: 1,
      pageNumber: 1,
      pageSize: 20,
      requestUrl: "/api/v1/users",
    });

    expect(schema.parse(response)).toEqual(response);
  });

  it("rejects invalid metadata supplied by a caller", () => {
    expect(() =>
      createPaginatedResponse({
        data: [],
        totalItems: -1,
        pageNumber: 1,
        pageSize: 20,
        requestUrl: "/api/v1/users",
      }),
    ).toThrow("totalItems must be a non-negative integer.");
  });
});
