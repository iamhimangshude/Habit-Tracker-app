import express from "express";
import habitRoutes from "./routes/habit.routes.js";
import analyticsRoutes from "./routes/analytics.routes.js";

const app = express();

app.use(express.json());

app.get("/", function (req, res) {
  return res.json({ message: "Hello world" });
});

// Registering habit routes
const BASE_URL = process.env.BASE_URL || "/api/v1";

app.use(`${BASE_URL}/habits`, habitRoutes);

// registering analytics routes
app.use(`${BASE_URL}/analytics`, analyticsRoutes);

// registering errorHandler middleware
import { errorHandler } from "./middlewares/errorHandler.middlewares.js";
app.use(errorHandler);

export { app };
