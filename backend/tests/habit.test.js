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

describe("Habits API Endpoints (/api/v1/habits)", () => {
  describe("POST /api/v1/habits", () => {
    it("should create a habit and return 201", async () => {
      const payload = {
        name: "Morning Run",
        description: "Run 5km",
        category: "health",
        frequency: "daily",
        targetValue: 1,
      };

      const res = await request(app)
        .post("/api/v1/habits")
        .send(payload)
        .expect("Content-Type", /json/);

      expect(res.statusCode).toBe(201);
      expect(res.body.data).toHaveProperty("_id");
      expect(res.body.data.name).toBe(payload.name);
    });

    it("should return 400 when creating a duplicate habit name", async () => {
      await Habit.create({ name: "Morning Run" });

      const res = await request(app)
        .post("/api/v1/habits")
        .send({ name: "Morning Run" });

      expect(res.statusCode).toBe(400);
    });
  });

  describe("GET /api/v1/habits", () => {
    beforeEach(async () => {
      await Habit.create([
        { name: "Meditation", category: "mindfulness", isArchived: false },
        { name: "Reading", category: "learning", isArchived: false },
        { name: "Gym", category: "health", isArchived: true },
      ]);
    });

    it("should return active habits by default", async () => {
      const res = await request(app).get("/api/v1/habits").expect(200);

      expect(res.body.data.length).toBe(2);
      expect(res.body.data.every((h) => !h.isArchived)).toBe(true);
    });

    it("should filter habits by category", async () => {
      const res = await request(app)
        .get("/api/v1/habits?category=mindfulness")
        .expect(200);

      expect(res.body.data.length).toBe(1);
      expect(res.body.data[0].name).toBe("Meditation");
    });
  });

  describe("PATCH /api/v1/habits/:id/archive & /unarchive", () => {
    it("should archive a habit and update timestamp", async () => {
      const habit = await Habit.create({ name: "Cycling" });

      const res = await request(app)
        .patch(`/api/v1/habits/${habit._id}/archive`)
        .expect(200);

      expect(res.body.data.isArchived).toBe(true);
      expect(res.body.data.archivedAt).not.toBeNull();
    });

    it("should unarchive a habit", async () => {
      const habit = await Habit.create({
        name: "Cycling",
        isArchived: true,
        archivedAt: new Date(),
      });

      const res = await request(app)
        .patch(`/api/v1/habits/${habit._id}/unarchive`)
        .expect(200);

      expect(res.body.data.isArchived).toBe(false);
      expect(res.body.data.archivedAt).toBeNull();
    });
  });

  describe("POST /api/v1/habits/:id/logs/toggle", () => {
    it("should create a completed log if none exists and return 200", async () => {
      const habit = await Habit.create({ name: "Drink Water" });

      const res = await request(app)
        .post(`/api/v1/habits/${habit._id}/logs/toggle`)
        .send({ date: "2026-08-16" });

      expect(res.statusCode).toBe(200);
      expect(res.body.data.isCompleted).toBe(true);
      expect(res.body.data.value).toBe(1);

      const dbLog = await Logger.findOne({
        habit: habit._id,
        date: "2026-08-16",
      });
      expect(dbLog).not.toBeNull();
      expect(dbLog.isCompleted).toBe(true);
    });

    it("should toggle an existing log to incomplete", async () => {
      const habit = await Habit.create({ name: "Drink Water" });
      await Logger.create({
        habit: habit._id,
        date: "2026-08-16",
        isCompleted: true,
        value: 1,
      });

      const res = await request(app)
        .post(`/api/v1/habits/${habit._id}/logs/toggle`)
        .send({ date: "2026-08-16" });

      expect(res.statusCode).toBe(200);
      expect(res.body.data.isCompleted).toBe(false);
      expect(res.body.data.value).toBe(0);
    });

    it("should return 400 if date is not provided", async () => {
      const habit = await Habit.create({ name: "Drink Water" });

      const res = await request(app)
        .post(`/api/v1/habits/${habit._id}/logs/toggle`)
        .send({});

      expect(res.statusCode).toBe(400);
    });
  });

  describe("GET /api/v1/habits/:id/logs", () => {
    it("should fetch log history for a habit", async () => {
      const habit = await Habit.create({ name: "Journaling" });
      await Logger.create([
        { habit: habit._id, date: "2026-08-10", isCompleted: true },
        { habit: habit._id, date: "2026-08-11", isCompleted: true },
      ]);

      const res = await request(app)
        .get(`/api/v1/habits/${habit._id}/logs`)
        .expect(200);

      expect(Array.isArray(res.body.data)).toBe(true);
    });
  });

  describe("GET /api/v1/habits/:id/stats", () => {
    it("should return habit streak counts and completed days", async () => {
      const habit = await Habit.create({
        name: "Code",
        streakCount: 4,
        longestStreakCount: 7,
      });

      await Logger.create([
        { habit: habit._id, date: "2026-08-14", isCompleted: true },
        { habit: habit._id, date: "2026-08-15", isCompleted: true },
      ]);

      const res = await request(app)
        .get(`/api/v1/habits/${habit._id}/stats`)
        .expect(200);

      expect(res.body.data.streak).toBe(4);
      expect(res.body.data.longestStreak).toBe(7);
      expect(res.body.data.totalCompletedDays).toBe(2);
    });
  });
});
