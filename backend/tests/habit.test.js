process.env.NODE_ENV = "dev";
process.env.ACCESS_TOKEN_SECRET =
  process.env.ACCESS_TOKEN_SECRET || "test_access_jwt_secret";
process.env.ACCESS_TOKEN_EXPIRY = process.env.ACCESS_TOKEN_EXPIRY || "15m";
process.env.REFRESH_TOKEN_SECRET =
  process.env.REFRESH_TOKEN_SECRET || "test_refresh_jwt_secret";
process.env.REFRESH_TOKEN_EXPIRY = process.env.REFRESH_TOKEN_EXPIRY || "7";

import request from "supertest";
import mongoose from "mongoose";
import jwt from "jsonwebtoken";
import { app } from "../app.js";
import { Habit, Logger, User } from "../models/index.models.js";

const logResponseOnError = (res) => {
  if (res.status >= 400) {
    console.log(
      `[SUPERTEST ERROR] - HTTP ${res.status}\nPATH: ${res.req.method} ${res.req.path}\nRESPONSE-BODY: ${JSON.stringify(res.body)}`,
    );
  }
};

const generateAuthToken = (user) => {
  return jwt.sign(
    { id: user._id.toString(), email: user.email, name: user.name },
    process.env.ACCESS_TOKEN_SECRET,
    { expiresIn: "15m" },
  );
};

beforeAll(async () => {
  const mongoUri =
    process.env.MONGO_URI || "mongodb://127.0.0.1:27017/habit_tracker_test";
  await mongoose.connect(mongoUri);
});

afterEach(async () => {
  await Habit.deleteMany({});
  await Logger.deleteMany({});
  await User.deleteMany({});
});

afterAll(async () => {
  await mongoose.connection.close();
});

describe("Habit API Endpoints (/api/v1/habits)", () => {
  let testUser;
  let authToken;
  let anotherUser;
  let anotherToken;

  beforeEach(async () => {
    testUser = await User.create({
      name: "John Doe",
      email: "john@example.com",
      password: "password123",
    });
    authToken = generateAuthToken(testUser);

    anotherUser = await User.create({
      name: "Jane Smith",
      email: "jane@example.com",
      password: "password123",
    });
    anotherToken = generateAuthToken(anotherUser);
  });

  describe("Authentication Guard", () => {
    it("should return 401 when Authorization header is missing", async () => {
      const res = await request(app).get("/api/v1/habits");
      expect(res.statusCode).toBe(401);
    });

    it("should return 401 when an invalid token is provided", async () => {
      const res = await request(app)
        .get("/api/v1/habits")
        .set("Authorization", "Bearer invalid-token");
      expect(res.statusCode).toBe(401);
    });
  });

  describe("POST /api/v1/habits", () => {
    it("should create a habit successfully and return 201", async () => {
      const payload = {
        name: "Morning Run",
        description: "Run 5km",
        category: "health",
        frequency: "daily",
        targetValue: 1,
      };

      const res = await request(app)
        .post("/api/v1/habits")
        .set("Authorization", `Bearer ${authToken}`)
        .send(payload)
        .expect("Content-Type", /json/)
        .expect((res) => logResponseOnError(res))
        .expect(201);

      expect(res.body.statusCode || res.body.status).toBe(201);
      expect(res.body.data).toHaveProperty("_id");
      expect(res.body.data.name).toBe("Morning Run");
      expect(res.body.data.user).toBe(testUser._id.toString());

      const habitInDb = await Habit.findById(res.body.data._id);
      expect(habitInDb).not.toBeNull();
      expect(habitInDb.name).toBe("Morning Run");
    });

    it("should return 400 when habit name is missing", async () => {
      const res = await request(app)
        .post("/api/v1/habits")
        .set("Authorization", `Bearer ${authToken}`)
        .send({ description: "No name habit" })
        .expect(400);

      expect(res.body.message).toMatch(/habit name required/i);
    });

    it("should return 400 when creating a duplicate habit for the same user", async () => {
      await Habit.create({
        name: "Read Books",
        user: testUser._id.toString(),
      });

      const res = await request(app)
        .post("/api/v1/habits")
        .set("Authorization", `Bearer ${authToken}`)
        .send({ name: "Read Books" })
        .expect(400);

      expect(res.body.message).toMatch(/habit already exists/i);
    });

    it("should allow different users to create habits with the same name", async () => {
      await Habit.create({
        name: "Read Books",
        user: anotherUser._id.toString(),
      });

      const res = await request(app)
        .post("/api/v1/habits")
        .set("Authorization", `Bearer ${authToken}`)
        .send({ name: "Read Books" })
        .expect((res) => logResponseOnError(res))
        .expect(201);

      expect(res.statusCode).toBe(201);
    });
  });

  describe("GET /api/v1/habits", () => {
    beforeEach(async () => {
      await Habit.create([
        {
          name: "Morning Meditation",
          category: "mindfulness",
          isArchived: false,
          user: testUser._id.toString(),
        },
        {
          name: "Read Docs",
          category: "learning",
          isArchived: false,
          user: testUser._id.toString(),
        },
        {
          name: "Old Routine",
          category: "health",
          isArchived: true,
          user: testUser._id.toString(),
        },
        {
          name: "Other User Habit",
          category: "mindfulness",
          isArchived: false,
          user: anotherUser._id.toString(),
        },
      ]);
    });

    it("should return only active habits for the authenticated user", async () => {
      const res = await request(app)
        .get("/api/v1/habits")
        .set("Authorization", `Bearer ${authToken}`)
        .expect(200);

      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBe(2);
      expect(res.body.data.every((h) => h.isArchived === false)).toBe(true);
      expect(
        res.body.data.every((h) => h.user === testUser._id.toString()),
      ).toBe(true);
    });

    it("should filter habits by category", async () => {
      const res = await request(app)
        .get("/api/v1/habits?category=mindfulness")
        .set("Authorization", `Bearer ${authToken}`)
        .expect(200);

      expect(res.body.data.length).toBe(1);
      expect(res.body.data[0].name).toBe("Morning Meditation");
    });

    it("should fetch archived habits when isArchived=true query is provided", async () => {
      const res = await request(app)
        .get("/api/v1/habits?isArchived=true")
        .set("Authorization", `Bearer ${authToken}`)
        .expect(200);

      expect(res.body.data.length).toBe(1);
      expect(res.body.data[0].name).toBe("Old Routine");
    });
  });

  describe("GET /api/v1/habits/:id", () => {
    it("should return a habit by ID for the owner", async () => {
      const habit = await Habit.create({
        name: "Hydrate",
        user: testUser._id.toString(),
      });

      const res = await request(app)
        .get(`/api/v1/habits/${habit._id}`)
        .set("Authorization", `Bearer ${authToken}`)
        .expect((res) => logResponseOnError(res))
        .expect(200);

      expect(res.body.data._id.toString()).toBe(habit._id.toString());
      expect(res.body.data.name).toBe("Hydrate");
    });

    it("should return 404 if the habit belongs to another user", async () => {
      const habit = await Habit.create({
        name: "Private Habit",
        user: anotherUser._id.toString(),
      });

      const res = await request(app)
        .get(`/api/v1/habits/${habit._id}`)
        .set("Authorization", `Bearer ${authToken}`)
        .expect(404);

      expect(res.body.message).toMatch(/habit does not exist|habit not found/i);
    });

    it("should return 404 for a non-existent habit ID", async () => {
      const randomId = new mongoose.Types.ObjectId().toString();
      const res = await request(app)
        .get(`/api/v1/habits/${randomId}`)
        .set("Authorization", `Bearer ${authToken}`)
        .expect(404);

      expect(res.statusCode).toBe(404);
    });
  });

  describe("PATCH /api/v1/habits/:id", () => {
    it("should update habit details and return 200", async () => {
      const habit = await Habit.create({
        name: "Workout",
        category: "others",
        user: testUser._id.toString(),
      });

      const res = await request(app)
        .patch(`/api/v1/habits/${habit._id}`)
        .set("Authorization", `Bearer ${authToken}`)
        .send({ name: "Strength Training", category: "health" })
        .expect(200);

      expect(res.body.data.name).toBe("Strength Training");
      expect(res.body.data.category).toBe("health");

      const habitInDb = await Habit.findById(habit._id);
      expect(habitInDb.name).toBe("Strength Training");
    });

    it("should return 400 when no valid update fields are provided", async () => {
      const habit = await Habit.create({
        name: "Workout",
        user: testUser._id.toString(),
      });

      const res = await request(app)
        .patch(`/api/v1/habits/${habit._id}`)
        .set("Authorization", `Bearer ${authToken}`)
        .send({})
        .expect(400);

      expect(res.body.message).toMatch(/no valid updated fields provided/i);
    });

    it("should return 404 when attempting to update a habit belonging to another user", async () => {
      const habit = await Habit.create({
        name: "Other's Workout",
        user: anotherUser._id.toString(),
      });

      const res = await request(app)
        .patch(`/api/v1/habits/${habit._id}`)
        .set("Authorization", `Bearer ${authToken}`)
        .send({ name: "Hacked Workout" })
        .expect(404);

      expect(res.statusCode).toBe(404);
    });
  });

  describe("PATCH /api/v1/habits/:id/archive & /unarchive", () => {
    it("should set isArchived to true and set archivedAt timestamp", async () => {
      const habit = await Habit.create({
        name: "Run 10km",
        isArchived: false,
        user: testUser._id.toString(),
      });

      const res = await request(app)
        .patch(`/api/v1/habits/${habit._id}/archive`)
        .set("Authorization", `Bearer ${authToken}`)
        .expect(200);

      expect(res.body.data.isArchived).toBe(true);
      expect(res.body.data.archivedAt).not.toBeNull();

      const habitInDb = await Habit.findById(habit._id);
      expect(habitInDb.isArchived).toBe(true);
    });

    it("should restore an archived habit and clear archivedAt", async () => {
      const habit = await Habit.create({
        name: "Run 10km",
        isArchived: true,
        archivedAt: new Date(),
        user: testUser._id.toString(),
      });

      const res = await request(app)
        .patch(`/api/v1/habits/${habit._id}/unarchive`)
        .set("Authorization", `Bearer ${authToken}`)
        .expect(200);

      expect(res.body.data.isArchived).toBe(false);
      expect(res.body.data.archivedAt).toBeNull();
    });
  });

  describe("POST /api/v1/habits/:id/logs/toggle", () => {
    it("should create a completed log if none exists and calculate streak", async () => {
      const habit = await Habit.create({
        name: "Drink 2L Water",
        user: testUser._id.toString(),
      });

      const res = await request(app)
        .post(`/api/v1/habits/${habit._id}/logs/toggle`)
        .set("Authorization", `Bearer ${authToken}`)
        .send({ date: "2026-08-18" })
        .expect(200);

      expect(res.body.data.isCompleted).toBe(true);
      expect(res.body.data.value).toBe(1);
      expect(res.body.data).toHaveProperty("streakCount");
      expect(res.body.data).toHaveProperty("longestStreakCount");

      const logInDb = await Logger.findOne({
        habit: habit._id,
        date: "2026-08-18",
      });
      expect(logInDb).not.toBeNull();
      expect(logInDb.isCompleted).toBe(true);
    });

    it("should toggle an existing log to incomplete", async () => {
      const habit = await Habit.create({
        name: "Drink 2L Water",
        user: testUser._id.toString(),
      });

      await Logger.create({
        habit: habit._id,
        date: "2026-08-18",
        isCompleted: true,
        value: 1,
      });

      const res = await request(app)
        .post(`/api/v1/habits/${habit._id}/logs/toggle`)
        .set("Authorization", `Bearer ${authToken}`)
        .send({ date: "2026-08-18" })
        .expect(200);

      expect(res.body.data.isCompleted).toBe(false);
      expect(res.body.data.value).toBe(0);
    });

    it("should return 400 if date is not provided", async () => {
      const habit = await Habit.create({
        name: "Drink 2L Water",
        user: testUser._id.toString(),
      });

      const res = await request(app)
        .post(`/api/v1/habits/${habit._id}/logs/toggle`)
        .set("Authorization", `Bearer ${authToken}`)
        .send({})
        .expect(400);

      expect(res.body.message).toMatch(/date is required/i);
    });

    it("should return 404 when toggling a habit belonging to another user", async () => {
      const habit = await Habit.create({
        name: "Foreign Habit",
        user: anotherUser._id.toString(),
      });

      const res = await request(app)
        .post(`/api/v1/habits/${habit._id}/logs/toggle`)
        .set("Authorization", `Bearer ${authToken}`)
        .send({ date: "2026-08-18" })
        .expect(404);

      expect(res.statusCode).toBe(404);
    });
  });

  describe("GET /api/v1/habits/:id/logs", () => {
    it("should fetch log entries for a habit sorted by date", async () => {
      const habit = await Habit.create({
        name: "Evening Reading",
        user: testUser._id.toString(),
      });

      await Logger.create([
        { habit: habit._id, date: "2026-08-16", isCompleted: true },
        { habit: habit._id, date: "2026-08-17", isCompleted: true },
      ]);

      const res = await request(app)
        .get(`/api/v1/habits/${habit._id}/logs`)
        .set("Authorization", `Bearer ${authToken}`)
        .expect(200);

      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBe(2);
      expect(res.body.data[0].date).toBe("2026-08-17");
    });

    it("should filter logs by date range query params", async () => {
      const habit = await Habit.create({
        name: "Evening Reading",
        user: testUser._id.toString(),
      });

      await Logger.create([
        { habit: habit._id, date: "2026-08-10", isCompleted: true },
        { habit: habit._id, date: "2026-08-15", isCompleted: true },
        { habit: habit._id, date: "2026-08-20", isCompleted: true },
      ]);

      const res = await request(app)
        .get(
          `/api/v1/habits/${habit._id}/logs?startDate=2026-08-12&endDate=2026-08-18`,
        )
        .set("Authorization", `Bearer ${authToken}`)
        .expect(200);

      expect(res.body.data.length).toBe(1);
      expect(res.body.data[0].date).toBe("2026-08-15");
    });
  });

  describe("GET /api/v1/habits/:id/stats", () => {
    it("should return streak stats and total completed days", async () => {
      const habit = await Habit.create({
        name: "Daily Journal",
        streakCount: 5,
        longestStreakCount: 10,
        user: testUser._id.toString(),
      });

      await Logger.create([
        { habit: habit._id, date: "2026-08-15", isCompleted: true },
        { habit: habit._id, date: "2026-08-16", isCompleted: true },
        { habit: habit._id, date: "2026-08-17", isCompleted: false },
      ]);

      const res = await request(app)
        .get(`/api/v1/habits/${habit._id}/stats`)
        .set("Authorization", `Bearer ${authToken}`)
        .expect(200);

      expect(res.body.data.streak).toBe(5);
      expect(res.body.data.longestStreak).toBe(10);
      expect(res.body.data.totalCompletedDays).toBe(2);
    });

    it("should return 404 when requesting stats for a non-existent habit", async () => {
      const nonExistentId = new mongoose.Types.ObjectId().toString();
      const res = await request(app)
        .get(`/api/v1/habits/${nonExistentId}/stats`)
        .set("Authorization", `Bearer ${authToken}`)
        .expect(404);

      expect(res.statusCode).toBe(404);
    });
  });
});
