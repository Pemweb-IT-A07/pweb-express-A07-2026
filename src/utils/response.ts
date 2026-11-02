import type { Response } from "express";

export interface PaginationMeta {
  currentPage: number;
  limit: number;
  totalItems: number;
  totalPages: number;
}

export function sendSuccess(
  res: Response,
  statusCode: number,
  message: string,
  data?: unknown,
  metadata?: PaginationMeta
) {
  res.status(statusCode).json({ status: true, message, data, metadata });
}
