import { Router } from "express";
import { heatmap, overview } from "../controllers/analytics.controllers.js";

const router = Router();

router.get("/overview", overview);
router.get("/heatmap", heatmap);

export default router;
