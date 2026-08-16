import request from "supertest";
import mongoose from "mongoose";
import { app } from "../app.js";
import { Habit, Logger } from "../models/index.models.js";

beforeAll(async () => {
  const mongoUri =
    process.env.MONGO_URI || "mongodb://127.0.0.1:27017/habit_tracker_test";
  await mongoose.connect(mongoUri);
});

afterEach(async () => {
  await Habit.deleteMany({});
  await Logger.deleteMany({});
});

afterAll(async () => {
  await mongoose.connection.close();
});

describe("Analytics API Endpoints (/api/v1/analytics)", () => {
  describe("GET /api/v1/analytics/overview", () => {
    it("should fetch completion status array for a specified date", async () => {
      const habit = await Habit.create({ name: "Yoga", isArchived: false });
      await Logger.create({
        habit: habit._id,
        date: "2026-08-16",
        isCompleted: true,
      });

      const res = await request(app)
        .get("/api/v1/analytics/overview?date=2026-08-16")
        .expect(200);

      expect(res.body.status).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
    });
  });

  describe("GET /api/v1/analytics/heatmap", () => {
    it("should return aggregated daily counts sorted chronologically", async () => {
      const habit1 = await Habit.create({ name: "Run" });
      const habit2 = await Habit.create({ name: "Read" });

      await Logger.create([
        { habit: habit1._id, date: "2026-08-14", isCompleted: true },
        { habit: habit2._id, date: "2026-08-14", isCompleted: true },
        { habit: habit1._id, date: "2026-08-15", isCompleted: true },
        { habit: habit2._id, date: "2026-08-15", isCompleted: false }, // Incomplete log should be ignored
      ]);

      const res = await request(app)
        .get(
          "/api/v1/analytics/heatmap?startDate=2026-08-01&endDate=2026-08-16",
        )
        .expect(200);

      expect(res.body.status).toBe(200);
      expect(res.body.data.length).toBe(2);

      // Aug 14 has 2 completions, Aug 15 has 1 completion
      const aug14 = res.body.data.find((d) => d.date === "2026-08-14");
      const aug15 = res.body.data.find((d) => d.date === "2026-08-15");

      expect(aug14.count).toBe(2);
      expect(aug15.count).toBe(1);
    });

    it("should filter heatmap for a specific habitId", async () => {
      const habit1 = await Habit.create({ name: "Run" });
      const habit2 = await Habit.create({ name: "Read" });

      await Logger.create([
        { habit: habit1._id, date: "2026-08-15", isCompleted: true },
        { habit: habit2._id, date: "2026-08-15", isCompleted: true },
      ]);

      const res = await request(app)
        .get(
          `/api/v1/analytics/heatmap?id=${habit1._id}&startDate=2026-08-01&endDate=2026-08-16`,
        )
        .expect(200);

      expect(res.body.data.length).toBe(1);
      expect(res.body.data[0].date).toBe("2026-08-15");
      expect(res.body.data[0].count).toBe(1);
    });
  });
});
