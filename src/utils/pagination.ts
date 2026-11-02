import type { PaginationMeta } from "./response.js";

function toPositiveInt(value: unknown, fallback: number) {
  const number = Number(value);
  return Number.isInteger(number) && number > 0 ? number : fallback;
}

// Ambil page & limit dari query (default page=1, limit=10)
export function getPagination(query: Record<string, unknown>) {
  const page = toPositiveInt(query.page, 1);
  const limit = toPositiveInt(query.limit, 10);
  return { page, limit, skip: (page - 1) * limit };
}

export function buildMeta(page: number, limit: number, totalItems: number): PaginationMeta {
  return { currentPage: page, limit, totalItems, totalPages: Math.ceil(totalItems / limit) };
}
