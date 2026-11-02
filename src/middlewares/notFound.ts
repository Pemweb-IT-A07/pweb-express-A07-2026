import type { NextFunction, Request, Response } from "express";
import { HttpError } from "../utils/HttpError.js";

export function notFound(req: Request, _res: Response, next: NextFunction) {
  next(new HttpError(404, `Endpoint ${req.method} ${req.originalUrl} tidak ditemukan`));
}
