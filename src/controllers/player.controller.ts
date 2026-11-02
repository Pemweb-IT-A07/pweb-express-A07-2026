import type { Request, Response } from "express";
import { prisma } from "../lib/prisma.js";
import { HttpError } from "../utils/HttpError.js";
import { sendSuccess } from "../utils/response.js";
import { isBlank, isPositiveInt, parseId } from "../utils/validation.js";

// Pastikan player ada, lempar 404 jika tidak
export async function findPlayerOrThrow(id: number) {
  const player = await prisma.player.findUnique({ where: { id } });
  if (!player) {
    throw new HttpError(404, "Player tidak ditemukan");
  }
  return player;
}

function parseNickname(nickname: unknown) {
  if (isBlank(nickname) || typeof nickname !== "string") {
    throw new HttpError(400, "nickname wajib diisi");
  }
  return nickname.trim();
}

export async function createPlayer(req: Request, res: Response) {
  const nickname = parseNickname(req.body?.nickname);

  const existing = await prisma.player.findUnique({ where: { nickname } });
  if (existing) {
    throw new HttpError(409, `Nickname ${nickname} sudah dipakai`);
  }

  const player = await prisma.player.create({ data: { nickname } });

  sendSuccess(res, 201, "Player berhasil dibuat", player);
}

export async function getPlayerById(req: Request, res: Response) {
  const id = parseId(req.params.player_id, "Player tidak ditemukan");

  const player = await prisma.player.findUnique({
    where: { id },
    include: {
      heroes: { orderBy: { id: "asc" }, include: { hero: { select: { name: true } } } },
    },
  });
  if (!player) {
    throw new HttpError(404, "Player tidak ditemukan");
  }

  const { heroes, ...profile } = player;
  sendSuccess(res, 200, "Berhasil mengambil data player", {
    ...profile,
    heroes: heroes.map((owned) => ({
      heroId: owned.heroId,
      name: owned.hero.name,
      currency: owned.currency,
      pricePaid: owned.pricePaid,
    })),
  });
}

export async function updatePlayer(req: Request, res: Response) {
  const id = parseId(req.params.player_id, "Player tidak ditemukan");
  await findPlayerOrThrow(id);

  const nickname = parseNickname(req.body?.nickname);

  const existing = await prisma.player.findUnique({ where: { nickname } });
  if (existing && existing.id !== id) {
    throw new HttpError(409, `Nickname ${nickname} sudah dipakai player lain`);
  }

  const player = await prisma.player.update({ where: { id }, data: { nickname } });

  sendSuccess(res, 200, "Player berhasil diperbarui", player);
}

export async function deletePlayer(req: Request, res: Response) {
  const id = parseId(req.params.player_id, "Player tidak ditemukan");
  await findPlayerOrThrow(id);

  // PlayerHero milik player ikut terhapus (onDelete: Cascade)
  const player = await prisma.player.delete({ where: { id } });

  sendSuccess(res, 200, "Player berhasil dihapus", player);
}

export async function topUp(req: Request, res: Response) {
  const { amount } = req.body ?? {};

  // 1. amount harus bilangan bulat > 0
  if (!isPositiveInt(amount)) {
    throw new HttpError(400, "amount harus bilangan bulat lebih dari 0");
  }

  // 2. Player harus ada
  const id = parseId(req.params.player_id, "Player tidak ditemukan");
  await findPlayerOrThrow(id);

  // 3. Tambah diamond
  const player = await prisma.player.update({
    where: { id },
    data: { diamond: { increment: amount } },
  });

  sendSuccess(res, 200, "Top up berhasil", { playerId: id, amount, diamond: player.diamond });
}

const MATCH_REWARD = { WIN: 300, LOSE: 100 } as const;

export async function playMatch(req: Request, res: Response) {
  const { result } = req.body ?? {};

  // 1. result harus WIN atau LOSE
  if (result !== "WIN" && result !== "LOSE") {
    throw new HttpError(400, "result harus WIN atau LOSE");
  }

  // 2. Player harus ada
  const id = parseId(req.params.player_id, "Player tidak ditemukan");
  await findPlayerOrThrow(id);

  // 3. Tambah BP sesuai hasil match
  const bpEarned = MATCH_REWARD[result as keyof typeof MATCH_REWARD];
  const player = await prisma.player.update({
    where: { id },
    data: { bp: { increment: bpEarned } },
  });

  sendSuccess(res, 200, "Hadiah match berhasil ditambahkan", {
    playerId: id,
    result,
    bpEarned,
    bp: player.bp,
  });
}
