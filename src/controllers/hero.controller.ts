import type { Request, Response } from "express";
import { Lane, Role, type Prisma } from "../generated/prisma/client.js";
import { prisma } from "../lib/prisma.js";
import { HttpError } from "../utils/HttpError.js";
import { buildMeta, getPagination } from "../utils/pagination.js";
import { sendSuccess } from "../utils/response.js";
import { isBlank, isEnumValue, parseId } from "../utils/validation.js";

export async function getHeroes(req: Request, res: Response) {
  const { page, limit, skip } = getPagination(req.query);
  const { search, role } = req.query;

  const where: Prisma.HeroWhereInput = {};
  if (typeof search === "string" && search.trim() !== "") {
    where.name = { contains: search.trim(), mode: "insensitive" };
  }
  if (role !== undefined) {
    if (!isEnumValue(Role, role)) {
      throw new HttpError(400, `Role harus salah satu dari: ${Object.values(Role).join(", ")}`);
    }
    where.role = role;
  }

  const [heroes, totalItems] = await Promise.all([
    prisma.hero.findMany({ where, skip, take: limit, orderBy: { id: "asc" } }),
    prisma.hero.count({ where }),
  ]);

  sendSuccess(res, 200, "Berhasil mengambil data hero", heroes, buildMeta(page, limit, totalItems));
}

export async function getHeroById(req: Request, res: Response) {
  const id = parseId(req.params.hero_id, "Hero tidak ditemukan");

  const hero = await prisma.hero.findUnique({
    where: { id },
    include: { skins: { orderBy: { id: "asc" } } },
  });
  if (!hero) {
    throw new HttpError(404, "Hero tidak ditemukan");
  }

  sendSuccess(res, 200, "Berhasil mengambil detail hero", hero);
}

function isPrice(value: unknown) {
  return value === undefined || value === null || (Number.isInteger(value) && (value as number) >= 0);
}

export async function createHero(req: Request, res: Response) {
  const { name, role, lane, releaseYear, priceBP, priceDiamond } = req.body ?? {};

  // 1. Field wajib
  if (isBlank(name) || isBlank(role) || isBlank(lane) || isBlank(releaseYear)) {
    throw new HttpError(400, "name, role, lane, dan releaseYear wajib diisi");
  }
  if (typeof name !== "string") {
    throw new HttpError(400, "name harus berupa string");
  }
  if (!isEnumValue(Role, role)) {
    throw new HttpError(400, `role harus salah satu dari: ${Object.values(Role).join(", ")}`);
  }
  if (!isEnumValue(Lane, lane)) {
    throw new HttpError(400, `lane harus salah satu dari: ${Object.values(Lane).join(", ")}`);
  }
  if (!Number.isInteger(releaseYear)) {
    throw new HttpError(400, "releaseYear harus berupa bilangan bulat");
  }
  if (!isPrice(priceBP) || !isPrice(priceDiamond)) {
    throw new HttpError(400, "priceBP dan priceDiamond harus bilangan bulat >= 0 atau dikosongkan");
  }

  // 2. Nama unik
  const existing = await prisma.hero.findUnique({ where: { name: name.trim() } });
  if (existing) {
    throw new HttpError(409, `Hero ${existing.name} sudah ada`);
  }

  // 3. Simpan
  const hero = await prisma.hero.create({
    data: {
      name: name.trim(),
      role,
      lane,
      releaseYear,
      priceBP: priceBP ?? null,
      priceDiamond: priceDiamond ?? null,
    },
  });

  sendSuccess(res, 201, "Hero berhasil dibuat", hero);
}
