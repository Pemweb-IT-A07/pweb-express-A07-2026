import type { Request, Response } from "express";
import { prisma } from "../lib/prisma.js";
import { sendSuccess } from "../utils/response.js";

export async function getStatistics(_req: Request, res: Response) {
  const [totalPlayers, totalHeroesOwned, diamondSum, topOwned, roleGroups] = await Promise.all([
    prisma.player.count(),
    prisma.playerHero.count(),
    prisma.player.aggregate({ _sum: { diamond: true } }),
    prisma.playerHero.groupBy({
      by: ["heroId"],
      _count: { heroId: true },
      orderBy: [{ _count: { heroId: "desc" } }, { heroId: "asc" }],
      take: 1,
    }),
    prisma.hero.groupBy({
      by: ["role"],
      _count: { role: true },
      orderBy: [{ _count: { role: "desc" } }, { role: "asc" }],
    }),
  ]);

  // Hero paling banyak dimiliki beserta jumlah pemiliknya
  let mostOwnedHero = null;
  if (topOwned.length > 0) {
    const { heroId, _count } = topOwned[0];
    const hero = await prisma.hero.findUnique({ where: { id: heroId }, select: { name: true } });
    mostOwnedHero = { heroId, name: hero?.name, owners: _count.heroId };
  }

  sendSuccess(res, 200, "Berhasil mengambil statistik", {
    totalPlayers,
    totalHeroesOwned,
    totalDiamond: diamondSum._sum.diamond ?? 0,
    mostOwnedHero,
    heroesPerRole: roleGroups.map((group) => ({ role: group.role, total: group._count.role })),
  });
}
