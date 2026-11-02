import type { Request, Response } from "express";
import { Rarity, type Prisma } from "../generated/prisma/client.js";
import { prisma } from "../lib/prisma.js";
import { HttpError } from "../utils/HttpError.js";
import { buildMeta, getPagination } from "../utils/pagination.js";
import { sendSuccess } from "../utils/response.js";
import { isEnumValue, parseId } from "../utils/validation.js";

export async function getSkins(req: Request, res: Response) {
  const { page, limit, skip } = getPagination(req.query);
  const { heroId, rarity } = req.query;

  const where: Prisma.SkinWhereInput = {};
  if (heroId !== undefined) {
    const id = Number(heroId);
    if (!Number.isInteger(id) || id <= 0) {
      throw new HttpError(400, "heroId harus berupa bilangan bulat positif");
    }
    where.heroId = id;
  }
  if (rarity !== undefined) {
    if (!isEnumValue(Rarity, rarity)) {
      throw new HttpError(400, `Rarity harus salah satu dari: ${Object.values(Rarity).join(", ")}`);
    }
    where.rarity = rarity;
  }

  const [skins, totalItems] = await Promise.all([
    prisma.skin.findMany({
      where,
      skip,
      take: limit,
      orderBy: { id: "asc" },
      include: { hero: { select: { name: true } } },
    }),
    prisma.skin.count({ where }),
  ]);

  sendSuccess(res, 200, "Berhasil mengambil data skin", skins, buildMeta(page, limit, totalItems));
}

export async function getSkinById(req: Request, res: Response) {
  const id = parseId(req.params.skin_id, "Skin tidak ditemukan");

  const skin = await prisma.skin.findUnique({ where: { id }, include: { hero: true } });
  if (!skin) {
    throw new HttpError(404, "Skin tidak ditemukan");
  }

  sendSuccess(res, 200, "Berhasil mengambil detail skin", skin);
}
