import { Router } from "express";
import {
  createHabit,
  getAllHabits,
  getHabit,
  updateHabit,
  updateHabitSetArchive,
  updateHabitUnsetArchive,
} from "../controllers/habit.controllers.js";

const router = Router();

router.post("/", createHabit);
router.get("/", getAllHabits);
router.get("/:id", getHabit);
router.patch("/:id/archive", updateHabitSetArchive);
router.patch("/:id/unarchive", updateHabitUnsetArchive);
router.patch("/:id", updateHabit);
// router.get("/:id/stats");

export default router;
