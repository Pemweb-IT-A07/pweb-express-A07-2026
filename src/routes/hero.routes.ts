import { Router } from "express";
import { createHero, getHeroById, getHeroes } from "../controllers/hero.controller.js";

const router = Router();

router.get("/", getHeroes);
router.get("/:hero_id", getHeroById);
router.post("/", createHero);

export default router;
