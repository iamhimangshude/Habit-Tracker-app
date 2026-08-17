import express from "express";
import {
  habitRoutes,
  analyticsRoutes,
  authRoutes,
} from "./routes/index.routes.js";
import cookieParser from "cookie-parser";

const app = express();

app.use(express.json());

app.use(cookieParser());

app.get("/", function (req, res) {
  return res.json({ message: "Hello world" });
});

const BASE_URL = process.env.BASE_URL || "/api/v1";

// Registering auth routes
app.use(`${BASE_URL}/auth`, authRoutes);

// Registering habit routes
app.use(`${BASE_URL}/habits`, habitRoutes);

// registering analytics routes
app.use(`${BASE_URL}/analytics`, analyticsRoutes);

// registering errorHandler middleware
import { errorHandler } from "./middlewares/errorHandler.middlewares.js";
app.use(errorHandler);

export { app };
