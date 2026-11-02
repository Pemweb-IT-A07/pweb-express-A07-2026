import type { NextFunction, Request, Response } from "express";

// Catat setiap request setelah response terkirim, contoh: GET /api/heroes 200
export function logger(req: Request, res: Response, next: NextFunction) {
  res.on("finish", () => {
    console.log(`${req.method} ${req.originalUrl} ${res.statusCode}`);
  });
  next();
}
