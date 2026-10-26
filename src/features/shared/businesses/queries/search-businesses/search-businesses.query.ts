import { Prisma } from "../../../../../generated/prisma/client.js";
import type { DatabaseClient } from "../../../../../infrastructure/database/index.js";
import { getRatingCutoff } from "../../../reviews/review.policy.js";
import type { SearchBusinessesQuery } from "./search-businesses.contract.js";
import { presentBusinessSearchResult } from "./search-businesses.presenter.js";
import { businessSearchResultSelect } from "./search-businesses.select.js";

interface ProximitySearchQuery extends SearchBusinessesQuery {
  latitude: number;
  longitude: number;
  radiusKm: number;
}

interface TextSearchQuery extends SearchBusinessesQuery {
  search: string;
}

interface ProximityBusinessRow {
  businessId: string;
  locationId: string;
  distanceMeters: number;
  totalCount: bigint;
}

interface TextSearchBusinessRow {
  businessId: string;
  totalCount: bigint;
}

function isProximityBusinessRow(
  match: ProximityBusinessRow | TextSearchBusinessRow
): match is ProximityBusinessRow {
  return "locationId" in match;
}

function hasProximity(query: SearchBusinessesQuery): query is ProximitySearchQuery {
  return query.latitude !== undefined && query.longitude !== undefined && query.radiusKm !== undefined;
}

function hasTextSearch(query: SearchBusinessesQuery): query is TextSearchQuery {
  return query.search !== undefined;
}

function createLocationFilter(query: SearchBusinessesQuery): Prisma.BusinessLocationWhereInput {
  return {
    status: "ACTIVE",
    ...(query.county ? { county: { equals: query.county, mode: "insensitive" } } : {}),
    ...(query.city ? { cityOrTown: { equals: query.city, mode: "insensitive" } } : {}),
    ...(query.facilityType
      ? {
          facilityType: {
            equals: query.facilityType,
            mode: "insensitive"
          }
        }
      : {}),
    ...(query.serviceId
      ? {
          services: {
            some: { serviceId: query.serviceId }
          }
        }
      : {})
  };
}

export function createBusinessSearchWhere(query: SearchBusinessesQuery): Prisma.BusinessWhereInput {
  const locationFilter = createLocationFilter(query);

  return {
    status: "APPROVED",
    locations: { some: locationFilter }
  };
}

function createPrismaOrderBy(query: SearchBusinessesQuery): Prisma.BusinessOrderByWithRelationInput[] {
  return query.sort === "newest"
    ? [{ approvedAt: "desc" }, { id: "asc" }]
    : [{ displayName: "asc" }, { id: "asc" }];
}

function escapeLikePattern(value: string): string {
  return value.replace(/[\\%_]/g, "\\$&");
}

function createEligibleLocationConditions(query: SearchBusinessesQuery): Prisma.Sql[] {
  const conditions = [Prisma.sql`filter_location."status" = ${"ACTIVE"}::"BusinessLocationStatus"`];

  if (query.county) {
    conditions.push(Prisma.sql`LOWER(filter_location."county") = LOWER(${query.county})`);
  }

  if (query.city) {
    conditions.push(Prisma.sql`LOWER(filter_location."city_or_town") = LOWER(${query.city})`);
  }

  if (query.facilityType) {
    conditions.push(Prisma.sql`LOWER(filter_location."facility_type") = LOWER(${query.facilityType})`);
  }

  if (query.serviceId) {
    conditions.push(Prisma.sql`
      EXISTS (
        SELECT 1
        FROM "business_location_services" AS filter_service
        WHERE filter_service."business_location_id" = filter_location."id"
          AND filter_service."service_id" = ${query.serviceId}::uuid
      )
    `);
  }

  return conditions;
}

async function findTextSearchMatches(
  transaction: Prisma.TransactionClient,
  query: TextSearchQuery
): Promise<TextSearchBusinessRow[]> {
  const eligibleLocationConditions = createEligibleLocationConditions(query);
  const escapedSearch = escapeLikePattern(query.search);
  const containsPattern = `%${escapedSearch}%`;
  const offset = (query.pageNumber - 1) * query.pageSize;
  const orderBy =
    query.sort === "name"
      ? Prisma.sql`b."display_name" ASC, ranked."businessId" ASC`
      : query.sort === "newest"
        ? Prisma.sql`b."approved_at" DESC NULLS LAST, ranked."businessId" ASC`
        : Prisma.sql`ranked."relevanceScore" DESC, b."display_name" ASC, ranked."businessId" ASC`;

  return transaction.$queryRaw<TextSearchBusinessRow[]>(Prisma.sql`
    WITH "searchInput" AS (
      SELECT
        ${query.search}::text AS "term",
        ${containsPattern}::text AS "containsPattern",
        websearch_to_tsquery('simple', ${query.search}) AS "textQuery"
    ),
    "eligibleBusinesses" AS (
      SELECT
        b."id",
        b."display_name" AS "displayName",
        b."legal_name" AS "legalName",
        b."approved_at" AS "approvedAt"
      FROM "businesses" AS b
      WHERE b."status" = ${"APPROVED"}::"BusinessStatus"
        AND EXISTS (
          SELECT 1
          FROM "business_locations" AS filter_location
          WHERE filter_location."business_id" = b."id"
            AND ${Prisma.join(eligibleLocationConditions, " AND ")}
        )
    ),
    "searchHits" AS (
      SELECT
        eligible."id" AS "businessId",
        (
          CASE
            WHEN LOWER(eligible."displayName") = LOWER(input."term") THEN 100
            WHEN starts_with(LOWER(eligible."displayName"), LOWER(input."term")) THEN 80
            WHEN (
              COALESCE(eligible."displayName", '') || ' ' ||
              COALESCE(eligible."legalName", '')
            ) ILIKE input."containsPattern" ESCAPE '\\' THEN 60
            ELSE 0
          END
          + 20 * ts_rank_cd(
              to_tsvector(
                'simple',
                COALESCE(eligible."displayName", '') || ' ' ||
                COALESCE(eligible."legalName", '')
              ),
              input."textQuery"
            )
          + 10 * word_similarity(
              input."term",
              COALESCE(eligible."displayName", '') || ' ' ||
              COALESCE(eligible."legalName", '')
            )
        )::double precision AS "relevanceScore"
      FROM "eligibleBusinesses" AS eligible
      CROSS JOIN "searchInput" AS input
      WHERE to_tsvector(
              'simple',
              COALESCE(eligible."displayName", '') || ' ' ||
              COALESCE(eligible."legalName", '')
            ) @@ input."textQuery"
         OR (
              COALESCE(eligible."displayName", '') || ' ' ||
              COALESCE(eligible."legalName", '')
            ) ILIKE input."containsPattern" ESCAPE '\\'
         OR (
              COALESCE(eligible."displayName", '') || ' ' ||
              COALESCE(eligible."legalName", '')
            ) %> input."term"

      UNION ALL

      SELECT
        location."business_id" AS "businessId",
        (
          CASE
            WHEN LOWER(location."name") = LOWER(input."term") THEN 50
            WHEN starts_with(LOWER(location."name"), LOWER(input."term")) THEN 40
            ELSE 0
          END
          + 12 * ts_rank_cd(
              to_tsvector(
                'simple',
                COALESCE(location."name", '') || ' ' ||
                COALESCE(location."facility_type", '') || ' ' ||
                COALESCE(location."description", '') || ' ' ||
                COALESCE(location."address_line", '') || ' ' ||
                COALESCE(location."county", '') || ' ' ||
                COALESCE(location."city_or_town", '')
              ),
              input."textQuery"
            )
          + 8 * word_similarity(
              input."term",
              COALESCE(location."name", '') || ' ' ||
              COALESCE(location."facility_type", '') || ' ' ||
              COALESCE(location."description", '') || ' ' ||
              COALESCE(location."address_line", '') || ' ' ||
              COALESCE(location."county", '') || ' ' ||
              COALESCE(location."city_or_town", '')
            )
        )::double precision AS "relevanceScore"
      FROM "business_locations" AS location
      INNER JOIN "eligibleBusinesses" AS eligible
        ON eligible."id" = location."business_id"
      CROSS JOIN "searchInput" AS input
      WHERE location."status" = ${"ACTIVE"}::"BusinessLocationStatus"
        AND (
          to_tsvector(
            'simple',
            COALESCE(location."name", '') || ' ' ||
            COALESCE(location."facility_type", '') || ' ' ||
            COALESCE(location."description", '') || ' ' ||
            COALESCE(location."address_line", '') || ' ' ||
            COALESCE(location."county", '') || ' ' ||
            COALESCE(location."city_or_town", '')
          ) @@ input."textQuery"
          OR (
            COALESCE(location."name", '') || ' ' ||
            COALESCE(location."facility_type", '') || ' ' ||
            COALESCE(location."description", '') || ' ' ||
            COALESCE(location."address_line", '') || ' ' ||
            COALESCE(location."county", '') || ' ' ||
            COALESCE(location."city_or_town", '')
          ) ILIKE input."containsPattern" ESCAPE '\\'
          OR (
            COALESCE(location."name", '') || ' ' ||
            COALESCE(location."facility_type", '') || ' ' ||
            COALESCE(location."description", '') || ' ' ||
            COALESCE(location."address_line", '') || ' ' ||
            COALESCE(location."county", '') || ' ' ||
            COALESCE(location."city_or_town", '')
          ) %> input."term"
        )

      UNION ALL

      SELECT
        location."business_id" AS "businessId",
        (
          CASE
            WHEN LOWER(service."name") = LOWER(input."term") THEN 45
            WHEN starts_with(LOWER(service."name"), LOWER(input."term")) THEN 35
            ELSE 0
          END
          + 10 * ts_rank_cd(
              to_tsvector('simple', service."name"),
              input."textQuery"
            )
          + 7 * word_similarity(input."term", service."name")
        )::double precision AS "relevanceScore"
      FROM "services" AS service
      INNER JOIN "business_location_services" AS location_service
        ON location_service."service_id" = service."id"
      INNER JOIN "business_locations" AS location
        ON location."id" = location_service."business_location_id"
       AND location."status" = ${"ACTIVE"}::"BusinessLocationStatus"
      INNER JOIN "eligibleBusinesses" AS eligible
        ON eligible."id" = location."business_id"
      CROSS JOIN "searchInput" AS input
      WHERE to_tsvector('simple', service."name") @@ input."textQuery"
         OR service."name" ILIKE input."containsPattern" ESCAPE '\\'
         OR service."name" %> input."term"

      UNION ALL

      SELECT
        location."business_id" AS "businessId",
        (
          CASE
            WHEN LOWER(staff."display_name") = LOWER(input."term") THEN 35
            WHEN starts_with(LOWER(staff."display_name"), LOWER(input."term")) THEN 25
            ELSE 0
          END
          + 8 * ts_rank_cd(
              to_tsvector(
                'simple',
                COALESCE(staff."display_name", '') || ' ' ||
                COALESCE(staff."professional_title", '')
              ),
              input."textQuery"
            )
          + 6 * word_similarity(
              input."term",
              COALESCE(staff."display_name", '') || ' ' ||
              COALESCE(staff."professional_title", '')
            )
        )::double precision AS "relevanceScore"
      FROM "business_staff_members" AS staff
      INNER JOIN "business_locations" AS location
        ON location."id" = staff."business_location_id"
       AND location."status" = ${"ACTIVE"}::"BusinessLocationStatus"
      INNER JOIN "eligibleBusinesses" AS eligible
        ON eligible."id" = location."business_id"
      CROSS JOIN "searchInput" AS input
      WHERE staff."is_public" = true
        AND (
          to_tsvector(
            'simple',
            COALESCE(staff."display_name", '') || ' ' ||
            COALESCE(staff."professional_title", '')
          ) @@ input."textQuery"
          OR (
            COALESCE(staff."display_name", '') || ' ' ||
            COALESCE(staff."professional_title", '')
          ) ILIKE input."containsPattern" ESCAPE '\\'
          OR (
            COALESCE(staff."display_name", '') || ' ' ||
            COALESCE(staff."professional_title", '')
          ) %> input."term"
        )
    ),
    "rankedBusinesses" AS (
      SELECT
        "businessId",
        MAX("relevanceScore") AS "relevanceScore"
      FROM "searchHits"
      GROUP BY "businessId"
    )
    SELECT
      ranked."businessId",
      COUNT(*) OVER () AS "totalCount"
    FROM "rankedBusinesses" AS ranked
    INNER JOIN "businesses" AS b
      ON b."id" = ranked."businessId"
    ORDER BY ${orderBy}
    LIMIT ${query.pageSize}
    OFFSET ${offset}
  `);
}

function createProximityConditions(query: ProximitySearchQuery, searchPoint: Prisma.Sql): Prisma.Sql[] {
  const conditions = [
    Prisma.sql`b."status" = ${"APPROVED"}::"BusinessStatus"`,
    Prisma.sql`bl."status" = ${"ACTIVE"}::"BusinessLocationStatus"`,
    Prisma.sql`bl."location" IS NOT NULL`,
    Prisma.sql`ST_DWithin(bl."location", ${searchPoint}, ${query.radiusKm * 1_000})`
  ];

  if (query.county) {
    conditions.push(Prisma.sql`bl."county" ILIKE ${query.county}`);
  }

  if (query.city) {
    conditions.push(Prisma.sql`bl."city_or_town" ILIKE ${query.city}`);
  }

  if (query.facilityType) {
    conditions.push(Prisma.sql`LOWER(bl."facility_type") = LOWER(${query.facilityType})`);
  }

  if (query.serviceId) {
    conditions.push(Prisma.sql`
      EXISTS (
        SELECT 1
        FROM "business_location_services" AS bls
        WHERE bls."business_location_id" = bl."id"
          AND bls."service_id" = ${query.serviceId}::uuid
      )
    `);
  }

  if (query.search) {
    const pattern = `%${escapeLikePattern(query.search)}%`;

    conditions.push(Prisma.sql`
      (
        to_tsvector(
          'simple',
          COALESCE(b."display_name", '') || ' ' ||
          COALESCE(b."legal_name", '')
        ) @@ websearch_to_tsquery('simple', ${query.search})
        OR (
          COALESCE(b."display_name", '') || ' ' ||
          COALESCE(b."legal_name", '')
        ) ILIKE ${pattern} ESCAPE '\\'
        OR (
          COALESCE(b."display_name", '') || ' ' ||
          COALESCE(b."legal_name", '')
        ) %> ${query.search}
        OR to_tsvector(
          'simple',
          COALESCE(bl."name", '') || ' ' ||
          COALESCE(bl."facility_type", '') || ' ' ||
          COALESCE(bl."description", '') || ' ' ||
          COALESCE(bl."address_line", '') || ' ' ||
          COALESCE(bl."county", '') || ' ' ||
          COALESCE(bl."city_or_town", '')
        ) @@ websearch_to_tsquery('simple', ${query.search})
        OR (
          COALESCE(bl."name", '') || ' ' ||
          COALESCE(bl."facility_type", '') || ' ' ||
          COALESCE(bl."description", '') || ' ' ||
          COALESCE(bl."address_line", '') || ' ' ||
          COALESCE(bl."county", '') || ' ' ||
          COALESCE(bl."city_or_town", '')
        ) ILIKE ${pattern} ESCAPE '\\'
        OR (
          COALESCE(bl."name", '') || ' ' ||
          COALESCE(bl."facility_type", '') || ' ' ||
          COALESCE(bl."description", '') || ' ' ||
          COALESCE(bl."address_line", '') || ' ' ||
          COALESCE(bl."county", '') || ' ' ||
          COALESCE(bl."city_or_town", '')
        ) %> ${query.search}
        OR EXISTS (
          SELECT 1
          FROM "business_location_services" AS search_bls
          INNER JOIN "services" AS search_service
            ON search_service."id" = search_bls."service_id"
          WHERE search_bls."business_location_id" = bl."id"
            AND (
              to_tsvector('simple', search_service."name")
                @@ websearch_to_tsquery('simple', ${query.search})
              OR search_service."name" ILIKE ${pattern} ESCAPE '\\'
              OR search_service."name" %> ${query.search}
            )
        )
        OR EXISTS (
          SELECT 1
          FROM "business_staff_members" AS staff
          WHERE staff."business_location_id" = bl."id"
            AND staff."is_public" = true
            AND (
              to_tsvector(
                'simple',
                COALESCE(staff."display_name", '') || ' ' ||
                COALESCE(staff."professional_title", '')
              ) @@ websearch_to_tsquery('simple', ${query.search})
              OR (
                COALESCE(staff."display_name", '') || ' ' ||
                COALESCE(staff."professional_title", '')
              ) ILIKE ${pattern} ESCAPE '\\'
              OR (
                COALESCE(staff."display_name", '') || ' ' ||
                COALESCE(staff."professional_title", '')
              ) %> ${query.search}
            )
        )
      )
    `);
  }

  return conditions;
}

async function findProximityMatches(
  transaction: Prisma.TransactionClient,
  query: ProximitySearchQuery
): Promise<ProximityBusinessRow[]> {
  const searchPoint = Prisma.sql`
    ST_SetSRID(
      ST_MakePoint(${query.longitude}, ${query.latitude}),
      4326
    )::geography
  `;
  const conditions = createProximityConditions(query, searchPoint);
  const orderBy =
    query.sort === "name"
      ? Prisma.sql`"displayName" ASC, "businessId" ASC`
      : query.sort === "newest"
        ? Prisma.sql`"approvedAt" DESC NULLS LAST, "businessId" ASC`
        : Prisma.sql`"distanceMeters" ASC, "businessId" ASC`;
  const offset = (query.pageNumber - 1) * query.pageSize;

  return transaction.$queryRaw<ProximityBusinessRow[]>(Prisma.sql`
    WITH "locationMatches" AS (
      SELECT
        b."id" AS "businessId",
        b."display_name" AS "displayName",
        b."approved_at" AS "approvedAt",
        bl."id" AS "locationId",
        ST_Distance(bl."location", ${searchPoint}) AS "distanceMeters",
        ROW_NUMBER() OVER (
          PARTITION BY b."id"
          ORDER BY
            ST_Distance(bl."location", ${searchPoint}) ASC,
            bl."id" ASC
        ) AS "locationRank"
      FROM "businesses" AS b
      INNER JOIN "business_locations" AS bl
        ON bl."business_id" = b."id"
      WHERE ${Prisma.join(conditions, " AND ")}
    ),
    "businessMatches" AS (
      SELECT *
      FROM "locationMatches"
      WHERE "locationRank" = 1
    )
    SELECT
      "businessId",
      "locationId",
      "distanceMeters",
      COUNT(*) OVER () AS "totalCount"
    FROM "businessMatches"
    ORDER BY ${orderBy}
    LIMIT ${query.pageSize}
    OFFSET ${offset}
  `);
}

async function getRatingsByBusinessId(transaction: Prisma.TransactionClient, businessIds: string[]) {
  if (businessIds.length === 0) {
    return new Map<string, { averageRating: number | null; reviewCount: number }>();
  }

  const ratings = await transaction.review.groupBy({
    by: ["businessId"],
    where: {
      businessId: { in: businessIds },
      status: "PUBLISHED",
      submittedAt: { gte: getRatingCutoff() }
    },
    _avg: { stars: true },
    _count: { _all: true }
  });

  return new Map(
    ratings.map((rating) => {
      const rawAverage = rating._avg.stars;

      return [
        rating.businessId,
        {
          averageRating: rawAverage === null ? null : Math.round(rawAverage * 100) / 100,
          reviewCount: rating._count._all
        }
      ];
    })
  );
}

export async function searchBusinesses(
  database: DatabaseClient,
  query: SearchBusinessesQuery,
  viewerUserId?: string
) {
  return database.$transaction(async (transaction) => {
    const proximityMatches = hasProximity(query) ? await findProximityMatches(transaction, query) : null;
    const textSearchMatches =
      !proximityMatches && hasTextSearch(query) ? await findTextSearchMatches(transaction, query) : null;
    const orderedMatches = proximityMatches ?? textSearchMatches;
    const where = orderedMatches
      ? {
          id: {
            in: orderedMatches.map((match) => match.businessId)
          },
          status: "APPROVED" as const
        }
      : createBusinessSearchWhere(query);

    const totalItems = orderedMatches
      ? Number(orderedMatches[0]?.totalCount ?? 0n)
      : await transaction.business.count({ where });
    const businesses = await transaction.business.findMany({
      where,
      ...(orderedMatches
        ? {}
        : {
            orderBy: createPrismaOrderBy(query),
            skip: (query.pageNumber - 1) * query.pageSize,
            take: query.pageSize
          }),
      select: businessSearchResultSelect
    });
    const businessById = new Map(businesses.map((business) => [business.id, business]));
    const orderedBusinesses = orderedMatches
      ? orderedMatches.flatMap((match) => {
          const business = businessById.get(match.businessId);

          return business ? [{ business, match }] : [];
        })
      : businesses.map((business) => ({ business, match: undefined }));
    const ratingsByBusinessId = await getRatingsByBusinessId(
      transaction,
      orderedBusinesses.map(({ business }) => business.id)
    );
    const followedBusinessIds = viewerUserId
      ? new Set(
          (
            await transaction.businessFollow.findMany({
              where: {
                businessId: { in: orderedBusinesses.map(({ business }) => business.id) },
                userId: viewerUserId
              },
              select: { businessId: true }
            })
          ).map(({ businessId }) => businessId)
        )
      : new Set<string>();

    return {
      totalItems,
      data: orderedBusinesses.map(({ business, match }) =>
        presentBusinessSearchResult(business, {
          query,
          rating: ratingsByBusinessId.get(business.id) ?? {
            averageRating: null,
            reviewCount: 0
          },
          isFollowedByCurrentUser: followedBusinessIds.has(business.id),
          ...(match && isProximityBusinessRow(match)
            ? {
                distanceMeters: match.distanceMeters,
                nearestLocationId: match.locationId
              }
            : {})
        })
      )
    };
  });
}
