import request from "supertest";
import mongoose from "mongoose";
import { app } from "../app.js";

beforeAll(async () => {
  // Use your test database URI or local MongoDB connection string
  const mongoUri =
    process.env.MONGO_URI || "mongodb://127.0.0.1:27017/habitTracker";
  await mongoose.connect(mongoUri);
});

afterAll(async () => {
  // Disconnect so Jest can exit cleanly without open handles
  await mongoose.connection.close();
});

// passes the test! testedAt: 2203 hrs IST (1733 hrs UTC)
describe("GET /api/v1/habits", () => {
  it("should return a list of habits with a 200 status code", async () => {
    const response = await request(app)
      .get("/api/v1/habits")
      .expect("Content-Type", /json/);

    expect(response.statusCode).toBe(200);
    expect(response.body.success).toBe(true);
    expect(Array.isArray(response.body.data)).toBe(true);
  });
});
