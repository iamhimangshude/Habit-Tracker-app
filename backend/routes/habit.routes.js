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
import { validateHeader } from "../middlewares/validateHeader.middlewares.js";

const router = Router();

router.post("/", validateHeader, createHabit);
router.get("/", validateHeader, getAllHabits);
router.patch("/:id/archive", validateHeader, updateHabitSetArchive);
router.patch("/:id/unarchive", validateHeader, updateHabitUnsetArchive);
router.get("/:id/stats", validateHeader, getHabitStats);
router.post("/:id/logs/toggle", validateHeader, toggleHabitCompletion);
router.get("/:id/logs", validateHeader, getHabitLogs);
router.patch("/:id", validateHeader, updateHabit);
router.get("/:id", validateHeader, getHabit);

export default router;
