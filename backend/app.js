import express from "express";
import habitRoutes from "./routes/habit.routes.js";

const app = express();

app.use(express.json());

app.get("/", function (req, res) {
  return res.json({ message: "Hello world" });
});

// Registering habit routes
app.use("/api/v1/habits", habitRoutes);

// registering errorHandler middleware
import { errorHandler } from "./middlewares/errorHandler.middlewares.js";
app.use(errorHandler);

export { app };
