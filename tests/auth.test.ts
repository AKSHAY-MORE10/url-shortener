import request from "supertest";
import app from "../src/app";
import { prisma } from "../src/config/prisma";

describe("Auth API Integration Tests", () => {
  const testUser = {
    email: "integration_test@example.com",
    password: "securePassword123",
  };

  describe("POST /api/v1/auth/register", () => {
    it("should register a new user and return a JWT token and user info", async () => {
      const response = await request(app)
        .post("/api/v1/auth/register")
        .send(testUser);

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty("token");
      expect(typeof response.body.token).toBe("string");
      expect(response.body).toHaveProperty("user");
      expect(response.body.user.email).toBe(testUser.email);
      expect(response.body.user).toHaveProperty("id");

      // Verify user in PostgreSQL test schema
      const dbUser = await prisma.user.findUnique({
        where: { email: testUser.email },
      });
      expect(dbUser).not.toBeNull();
      expect(dbUser?.passwordHash).toBeDefined();
      expect(dbUser?.passwordHash).not.toBe(testUser.password); // must be hashed
    });

    it("should return 409 Conflict if email is already registered", async () => {
      await request(app).post("/api/v1/auth/register").send(testUser);

      const response = await request(app)
        .post("/api/v1/auth/register")
        .send(testUser);

      expect(response.status).toBe(409);
      expect(response.body).toHaveProperty("error");
      expect(response.body.error).toContain("already exists");
    });

    it("should return 400 if email is invalid", async () => {
      const response = await request(app)
        .post("/api/v1/auth/register")
        .send({ email: "invalid-email", password: "securePassword123" });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty("error", "Validation failed");
    });

    it("should return 400 if password is less than 8 characters", async () => {
      const response = await request(app)
        .post("/api/v1/auth/register")
        .send({ email: "valid@example.com", password: "short" });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty("error", "Validation failed");
    });
  });

  describe("POST /api/v1/auth/login", () => {
    beforeEach(async () => {
      await request(app).post("/api/v1/auth/register").send(testUser);
    });

    it("should authenticate with correct credentials and return a token", async () => {
      const response = await request(app)
        .post("/api/v1/auth/login")
        .send(testUser);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("token");
      expect(response.body.user.email).toBe(testUser.email);
    });

    it("should return 401 Unauthorized on wrong password", async () => {
      const response = await request(app)
        .post("/api/v1/auth/login")
        .send({ email: testUser.email, password: "wrongPassword" });

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty("error", "Invalid email or password");
    });

    it("should return 401 Unauthorized on non-existent email", async () => {
      const response = await request(app)
        .post("/api/v1/auth/login")
        .send({ email: "unknown@example.com", password: "securePassword123" });

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty("error", "Invalid email or password");
    });
  });

  describe("Authenticated URL Creation", () => {
    it("should attach userId to the created URL when Bearer token is provided", async () => {
      // 1. Register & get token
      const regRes = await request(app)
        .post("/api/v1/auth/register")
        .send(testUser);
      const token = regRes.body.token;
      const userId = regRes.body.user.id;

      // 2. Create URL with Authorization header
      const createRes = await request(app)
        .post("/api/v1/urls")
        .set("Authorization", `Bearer ${token}`)
        .send({ originalUrl: "https://authenticated-target.com" });

      expect(createRes.status).toBe(201);
      const shortCode = createRes.body.shortCode;

      // 3. Verify in database that userId is linked
      const dbUrl = await prisma.url.findUnique({
        where: { shortCode },
      });
      expect(dbUrl?.userId).toBe(userId);
    });

    it("should create URL with userId as null when no Bearer token is provided", async () => {
      const createRes = await request(app)
        .post("/api/v1/urls")
        .send({ originalUrl: "https://anonymous-target.com" });

      expect(createRes.status).toBe(201);
      const shortCode = createRes.body.shortCode;

      const dbUrl = await prisma.url.findUnique({
        where: { shortCode },
      });
      expect(dbUrl?.userId).toBeNull();
    });
  });
});
