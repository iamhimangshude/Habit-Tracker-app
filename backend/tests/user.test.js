import request from "supertest";
import mongoose from "mongoose";
import jwt from "jsonwebtoken";

// Ensure environment variables exist before controllers and middlewares are loaded
process.env.ACCESS_TOKEN_SECRET =
  process.env.ACCESS_TOKEN_SECRET || "test_access_jwt_secret";
process.env.REFRESH_TOKEN_SECRET =
  process.env.REFRESH_TOKEN_SECRET || "test_refresh_jwt_secret";
process.env.REFRESH_TOKEN_EXPIRY = process.env.REFRESH_TOKEN_EXPIRY || "7";
process.env.ACCESS_TOKEN_EXPIRY = process.env.ACCESS_TOKEN_EXPIRY || "1h";
process.env.ENV = "dev";

import { app } from "../app.js";
import { User } from "../models/user.models.js";

// Helper to log non-2xx responses via Supertest .expect() callback
// const logResponseOnError = (res) => {
//   if (res.status >= 400) {
//     console.error(`\n[SUPERTEST DEBUG - HTTP ${res.status}]`);
//     console.error("Path:", res.req.method, res.req.path);
//     console.error("Body:", JSON.stringify(res.body, null, 2));
//     console.error("STACK:", JSON.stringify(res.body.stack, null, 2));
//     if (res.text && !Object.keys(res.body || {}).length) {
//       console.error("Raw Text:", res.text);
//     }
//   }
// };

const generateAuthToken = (payload) => {
  return jwt.sign(payload, process.env.ACCESS_TOKEN_SECRET, {
    expiresIn: "15m",
  });
};

beforeAll(async () => {
  const mongoUri =
    process.env.MONGO_URI || "mongodb://127.0.0.1:27017/habit_tracker_test";
  await mongoose.connect(mongoUri);
});

afterEach(async () => {
  await User.deleteMany({});
});

afterAll(async () => {
  await mongoose.connection.close();
});

describe("User Auth Endpoints (/api/v1/auth)", () => {
  describe("POST /api/v1/auth/register", () => {
    it("should register a new user successfully and return 201", async () => {
      const payload = {
        name: "Alice Johnson",
        email: "alice@example.com",
        password: "password123",
        confirmPassword: "password123",
      };

      const res = await request(app)
        .post("/api/v1/auth/register")
        .send(payload)
        // .expect(logResponseOnError)
        .expect("Content-Type", /json/)
        .expect(201);

      expect(res.body.status).toBe(201);
      expect(res.body.message).toBe("user created");
      expect(res.body.data).toHaveProperty("_id");
      expect(res.body.data.name).toBe(payload.name);
      expect(res.body.data.email).toBe(payload.email);
      expect(res.body.data).not.toHaveProperty("password");
      expect(res.body.data).not.toHaveProperty("refreshToken");

      const userInDb = await User.findOne({ email: payload.email });
      expect(userInDb).not.toBeNull();
      expect(userInDb.name).toBe(payload.name);
    });

    it("should return 400 when required fields are missing", async () => {
      const res = await request(app)
        .post("/api/v1/auth/register")
        .send({ email: "alice@example.com", password: "password123" })
        // .expect(logResponseOnError)
        .expect(400);

      expect(res.body.message).toMatch(/fields are required/i);
    });

    it("should return 400 when passwords do not match", async () => {
      const res = await request(app)
        .post("/api/v1/auth/register")
        .send({
          name: "Alice",
          email: "alice@example.com",
          password: "password123",
          confirmPassword: "password456",
        })
        // .expect(logResponseOnError)
        .expect(400);

      expect(res.body.message).toBe("passwords don't match");
    });

    it("should return 400 if user already exists", async () => {
      await User.create({
        name: "Existing User",
        email: "existing@example.com",
        password: "hashedPassword123",
      });

      const res = await request(app)
        .post("/api/v1/auth/register")
        .send({
          name: "Existing User",
          email: "existing@example.com",
          password: "password123",
          confirmPassword: "password123",
        })
        // .expect(logResponseOnError)
        .expect(400);

      expect(res.body.message).toBe("user already exists");
    });
  });

  describe("POST /api/v1/auth/login", () => {
    it("should authenticate a user, set refreshToken cookie, and return 200 with tokens", async () => {
      const plainPassword = "securePassword123";
      const user = await User.create({
        name: "Bob Martin",
        email: "bob@example.com",
        password: plainPassword,
      });

      const res = await request(app)
        .post("/api/v1/auth/login")
        .send({ email: "bob@example.com", password: plainPassword })
        // .expect(logResponseOnError)
        .expect("Content-Type", /json/)
        .expect(200);

      expect(res.body.status).toBe(200);
      expect(res.body.message).toBe("user logged in");
      expect(res.body.data).toHaveProperty("accessToken");
      expect(res.body.data.email).toBe(user.email);
      expect(res.body.data).not.toHaveProperty("password");

      const cookies = res.headers["set-cookie"];
      expect(cookies).toBeDefined();
      expect(cookies.some((c) => c.includes("refreshToken="))).toBe(true);
      expect(cookies.some((c) => c.includes("HttpOnly"))).toBe(true);
    });

    it("should return 400 when invalid credentials are provided", async () => {
      await User.create({
        name: "Bob Martin",
        email: "bob@example.com",
        password: "correctPassword",
      });

      const res = await request(app)
        .post("/api/v1/auth/login")
        .send({ email: "bob@example.com", password: "wrongPassword" })
        // .expect(logResponseOnError)
        .expect(400);

      expect(res.body.message).toBe("invalid credentials");
    });

    it("should return 400 when email or password is missing", async () => {
      const res = await request(app)
        .post("/api/v1/auth/login")
        .send({ email: "bob@example.com" })
        // .expect(logResponseOnError)
        .expect(400);

      expect(res.body.message).toBe("email and password are required");
    });
  });

  describe("POST /api/v1/auth/user/issue/tokens", () => {
    it("should refresh tokens successfully when a valid refreshToken cookie is provided", async () => {
      const user = await User.create({
        name: "Charlie",
        email: "charlie@example.com",
        password: "password123",
      });

      const validRefreshToken = jwt.sign(
        { id: user._id.toString(), email: user.email },
        process.env.REFRESH_TOKEN_SECRET,
        { expiresIn: "7d" },
      );

      await User.findByIdAndUpdate(user._id, {
        $set: { refreshToken: validRefreshToken },
      });

      const res = await request(app)
        .post("/api/v1/auth/user/issue/tokens")
        .set("Cookie", [`refreshToken=${validRefreshToken}`])
        // .expect(logResponseOnError)
        .expect("Content-Type", /json/)
        .expect(200);

      expect(res.body.status).toBe(200);
      expect(res.body.message).toBe("tokens regenerated");
      expect(res.body.data).toHaveProperty("accessToken");

      const cookies = res.headers["set-cookie"];
      expect(cookies).toBeDefined();
      expect(cookies.some((c) => c.includes("refreshToken="))).toBe(true);
    });

    it("should return 401 when refresh token cookie is missing", async () => {
      const res = await request(app)
        .post("/api/v1/auth/user/issue/tokens")
        // .expect(logResponseOnError)
        .expect(401);

      expect(res.body.message).toBe("refresh token missing");
    });

    it("should return 403 when refresh token is malformed or mismatched with DB", async () => {
      const user = await User.create({
        name: "Charlie",
        email: "charlie@example.com",
        password: "password123",
      });

      await User.findByIdAndUpdate(user._id, {
        $set: { refreshToken: "saved-token-in-db" },
      });

      const differentValidJwt = jwt.sign(
        { id: user._id.toString(), email: user.email },
        process.env.REFRESH_TOKEN_SECRET,
        { expiresIn: "7d" },
      );

      const res = await request(app)
        .post("/api/v1/auth/user/issue/tokens")
        .set("Cookie", [`refreshToken=${differentValidJwt}`])
        // .expect(logResponseOnError)
        .expect(403);

      expect(res.body.message).toBe("malformed refresh token");
    });
  });

  describe("Protected Endpoints (Requires validateHeader)", () => {
    let authUser;
    let authToken;

    beforeEach(async () => {
      authUser = await User.create({
        name: "Diana Prince",
        email: "diana@example.com",
        password: "password123",
      });

      authToken = generateAuthToken({
        id: authUser._id.toString(),
        name: authUser.name,
        email: authUser.email,
      });
    });

    describe("GET /api/v1/auth/user/details", () => {
      it("should fetch authenticated user details with 200", async () => {
        const res = await request(app)
          .get("/api/v1/auth/user/details")
          .set("Authorization", `Bearer ${authToken}`)
          // .expect(logResponseOnError)
          .expect("Content-Type", /json/)
          .expect(200);

        expect(res.body.status).toBe(200);
        expect(res.body.data._id.toString()).toBe(authUser._id.toString());
        expect(res.body.data.email).toBe(authUser.email);
        expect(res.body.data).not.toHaveProperty("password");
      });

      it("should return 401 if authorization header is missing", async () => {
        const res = await request(app)
          .get("/api/v1/auth/user/details")
          // .expect(logResponseOnError)
          .expect(401);

        expect(res.statusCode).toBe(401);
      });
    });

    describe("PATCH /api/v1/auth/user/update", () => {
      it("should update user name/email and return 200", async () => {
        const updatePayload = {
          name: "Diana Prince Updated",
          email: "diana_new@example.com",
          password: "password123",
        };

        const res = await request(app)
          .patch("/api/v1/auth/user/update")
          .set("Authorization", `Bearer ${authToken}`)
          .send(updatePayload)
          // .expect(logResponseOnError)
          .expect("Content-Type", /json/)
          .expect(200);

        expect(res.body.status).toBe(200);
        expect(res.body.data.name).toBe("Diana Prince Updated");

        const updatedDbUser = await User.findById(authUser._id);
        expect(updatedDbUser.name).toBe("Diana Prince Updated");
      });
    });

    describe("DELETE /api/v1/auth/user/delete", () => {
      it("should delete user, clear refreshToken cookie, and return 200", async () => {
        const res = await request(app)
          .delete("/api/v1/auth/user/delete")
          .set("Authorization", `Bearer ${authToken}`)
          // .expect(logResponseOnError)
          .expect("Content-Type", /json/)
          .expect(200);

        expect(res.body.status).toBe(200);
        expect(res.body.message).toBe("user deleted");

        const userInDb = await User.findById(authUser._id);
        expect(userInDb).toBeNull();
      });
    });
  });
});
