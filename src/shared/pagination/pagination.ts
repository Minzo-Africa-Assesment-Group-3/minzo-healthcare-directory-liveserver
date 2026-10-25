import type { PaginationMetadata } from "./pagination.schema.js";

export interface PaginatedResponse<T> {
  data: T[];
  pagination: PaginationMetadata;
}

export interface CreatePaginatedResponseOptions<T> {
  data: T[];
  pageNumber: number;
  pageSize: number;
  requestUrl: string;
  totalItems: number;
}

function assertPositiveInteger(value: number, name: string): void {
  if (!Number.isInteger(value) || value < 1) {
    throw new RangeError(`${name} must be a positive integer.`);
  }
}

function assertNonNegativeInteger(value: number, name: string): void {
  if (!Number.isInteger(value) || value < 0) {
    throw new RangeError(`${name} must be a non-negative integer.`);
  }
}

function createPageUrl(requestUrl: string, pageNumber: number, pageSize: number): string {
  const url = new URL(requestUrl, "http://localhost");

  url.searchParams.set("pageNumber", String(pageNumber));
  url.searchParams.set("pageSize", String(pageSize));

  return `${url.pathname}${url.search}`;
}

export function createPaginatedResponse<T>({
  data,
  pageNumber,
  pageSize,
  requestUrl,
  totalItems
}: CreatePaginatedResponseOptions<T>): PaginatedResponse<T> {
  assertPositiveInteger(pageNumber, "pageNumber");
  assertPositiveInteger(pageSize, "pageSize");
  assertNonNegativeInteger(totalItems, "totalItems");

  const totalPages = Math.ceil(totalItems / pageSize);
  const hasNextPage = pageNumber < totalPages;
  const hasPreviousPage = pageNumber > 1;

  return {
    data,
    pagination: {
      totalItems,
      totalPages,
      pageNumber,
      pageSize,
      hasNextPage,
      hasPreviousPage,
      nextPageUrl: hasNextPage ? createPageUrl(requestUrl, pageNumber + 1, pageSize) : null,
      previousPageUrl: hasPreviousPage ? createPageUrl(requestUrl, pageNumber - 1, pageSize) : null
    }
  };
}
