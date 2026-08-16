import { Router } from "express";
import {
  createHabit,
  getAllHabits,
  getHabit,
  getHabitLogs,
  getHabitStats,
  toggleHabitCompletion,
  updateHabit,
  updateHabitSetArchive,
  updateHabitUnsetArchive,
} from "../controllers/habit.controllers.js";

const router = Router();

router.post("/", createHabit);
router.get("/", getAllHabits);
router.patch("/:id/archive", updateHabitSetArchive);
router.patch("/:id/unarchive", updateHabitUnsetArchive);
router.get("/:id/stats", getHabitStats);
router.post("/:id/logs/toggle", toggleHabitCompletion);
router.get("/:id/logs", getHabitLogs);
router.patch("/:id", updateHabit);
router.get("/:id", getHabit);

export default router;
