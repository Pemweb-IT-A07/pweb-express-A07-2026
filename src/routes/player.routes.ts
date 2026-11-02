import { Router } from "express";
import {
  buyHero,
  createPlayer,
  deletePlayer,
  getPlayerById,
  playMatch,
  topUp,
  updatePlayer,
} from "../controllers/player.controller.js";

const router = Router();

router.post("/", createPlayer);
router.get("/:player_id", getPlayerById);
router.patch("/:player_id", updatePlayer);
router.delete("/:player_id", deletePlayer);
router.post("/:player_id/topup", topUp);
router.post("/:player_id/matches", playMatch);
router.post("/:player_id/heroes", buyHero);

export default router;
