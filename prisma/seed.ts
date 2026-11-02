import { readFileSync } from "node:fs";
import { prisma } from "../src/lib/prisma.js";
import type { Lane, Rarity, Role } from "../src/generated/prisma/client.js";

// Baca CSV sederhana (tanpa quote) menjadi array object berdasarkan header
function readCsv(path: string): Record<string, string>[] {
  const [header, ...rows] = readFileSync(path, "utf-8").trim().split(/\r?\n/);
  const keys = header.split(",");
  return rows.map((row) => {
    const values = row.split(",");
    return Object.fromEntries(keys.map((key, i) => [key, values[i] ?? ""]));
  });
}

const toIntOrNull = (value: string) => (value === "" ? null : Number(value));

async function main() {
  // 1. Kosongkan semua tabel dan reset id ke 1
  await prisma.$executeRawUnsafe(
    'TRUNCATE "PlayerHero", "Player", "Skin", "Hero" RESTART IDENTITY CASCADE'
  );

  // 2. Hero (urutan file sudah benar: Miya id 1, Hirara id 133)
  const heroes = readCsv("data/heroes.csv").map((h) => ({
    name: h.name,
    role: h.primaryRole as Role,
    lane: h.primaryLane as Lane,
    releaseYear: Number(h.releaseYear),
    priceBP: toIntOrNull(h.priceBP),
    priceDiamond: toIntOrNull(h.priceDiamond),
  }));
  await prisma.hero.createMany({ data: heroes });

  // 3. Skin
  const skins = readCsv("data/skins.csv").map((s) => ({
    name: s.name,
    heroId: Number(s.heroId),
    rarity: s.rarity as Rarity,
    priceDiamond: toIntOrNull(s.priceDiamond),
  }));
  await prisma.skin.createMany({ data: skins });

  // 4. Player dan PlayerHero
  await prisma.player.createMany({
    data: [
      { nickname: "ArekITS", bp: 1500, diamond: 75 },
      { nickname: "SangPushRank", bp: 13000, diamond: 2892 },
      { nickname: "MageSurabaya", bp: 10000, diamond: 0 },
    ],
  });

  await prisma.playerHero.createMany({
    data: [
      { playerId: 1, heroId: 18, currency: "BP", pricePaid: 2000 },
      { playerId: 1, heroId: 1, currency: "BP", pricePaid: 10800 },
      { playerId: 2, heroId: 84, currency: "DIAMOND", pricePaid: 599 },
      { playerId: 2, heroId: 56, currency: "BP", pricePaid: 32000 },
    ],
  });

  console.log(`Seed selesai: ${heroes.length} hero, ${skins.length} skin, 3 player, 4 player hero`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
