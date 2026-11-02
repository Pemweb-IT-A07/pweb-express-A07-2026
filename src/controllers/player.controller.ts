import type { Request, Response } from "express";
import { Currency } from "../generated/prisma/client.js";
import { prisma } from "../lib/prisma.js";
import { HttpError } from "../utils/HttpError.js";
import { sendSuccess } from "../utils/response.js";
import { isBlank, isEnumValue, isPositiveInt, parseId } from "../utils/validation.js";

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

export async function buyHero(req: Request, res: Response) {
  const { heroId, currency } = req.body ?? {};

  // 1. heroId wajib, currency harus BP atau DIAMOND
  if (!isPositiveInt(heroId) || !isEnumValue(Currency, currency)) {
    throw new HttpError(400, "heroId wajib diisi dan currency harus BP atau DIAMOND");
  }

  // 2. Player harus ada
  const playerId = parseId(req.params.player_id, "Player tidak ditemukan");
  const player = await findPlayerOrThrow(playerId);

  // 3. Hero harus ada
  const hero = await prisma.hero.findUnique({ where: { id: heroId } });
  if (!hero) {
    throw new HttpError(404, "Hero tidak ditemukan");
  }

  // 4. Hero harus punya harga untuk currency tersebut
  const price = currency === Currency.BP ? hero.priceBP : hero.priceDiamond;
  if (price === null) {
    throw new HttpError(400, `Hero ${hero.name} tidak bisa dibeli dengan ${currency}`);
  }

  // 5. Player belum memiliki hero tersebut
  const owned = await prisma.playerHero.findUnique({
    where: { playerId_heroId: { playerId, heroId } },
  });
  if (owned) {
    throw new HttpError(409, `Player sudah memiliki hero ${hero.name}`);
  }

  // 6. Saldo cukup
  const balance = currency === Currency.BP ? player.bp : player.diamond;
  if (balance < price) {
    throw new HttpError(400, `Saldo ${currency} tidak cukup untuk membeli ${hero.name}`);
  }

  // Kurangi saldo dan catat kepemilikan hero dalam satu transaction
  const balanceField = currency === Currency.BP ? "bp" : "diamond";
  const [updatedPlayer] = await prisma.$transaction([
    prisma.player.update({
      where: { id: playerId },
      data: { [balanceField]: { decrement: price } },
    }),
    prisma.playerHero.create({
      data: { playerId, heroId, currency, pricePaid: price },
    }),
  ]);

  sendSuccess(res, 201, "Hero berhasil dibeli", {
    hero: { id: hero.id, name: hero.name },
    currency,
    pricePaid: price,
    balance: { bp: updatedPlayer.bp, diamond: updatedPlayer.diamond },
  });
}
