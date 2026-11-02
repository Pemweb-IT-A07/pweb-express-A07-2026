import type { NextFunction, Request, Response } from "express";
import { HttpError } from "../utils/HttpError.js";

export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction) {
  if (err instanceof HttpError) {
    res.status(err.statusCode).json({ status: false, message: err.message });
    return;
  }

  // Body JSON tidak valid (dilempar oleh express.json)
  if (err instanceof SyntaxError && "type" in err && err.type === "entity.parse.failed") {
    res.status(400).json({ status: false, message: "Format JSON tidak valid" });
    return;
  }

  console.error(err);
  res.status(500).json({ status: false, message: "Terjadi kesalahan pada server" });
}
