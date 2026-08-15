import { Router } from "express";
import { createHabit, getAllHabits } from "../controllers/habit.controllers.js";

const router = Router();

router.post("/", createHabit);
router.get("/", getAllHabits);
// router.get("/:id");
// router.patch("/:id/archive");
// router.patch("/:id/unarchive");
// router.patch("/:id");
// router.get("/:id/stats");

export default router;
