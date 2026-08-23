import { Router } from "express";
import { heatmap, overview } from "../controllers/analytics.controllers.js";
import { validateHeader } from "../middlewares/validateHeader.middlewares.js";

const router = Router();

router.get("/overview", validateHeader, overview);
router.get("/heatmap", validateHeader, heatmap);

export default router;
