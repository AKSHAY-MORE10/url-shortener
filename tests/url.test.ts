import request from "supertest";
import app from "../src/app";
import { redis } from "../src/config/redis";
import { prisma } from "../src/config/prisma";

describe("URL Shortener API Integration Tests", () => {
  describe("POST /api/v1/urls", () => {
    it("should successfully create a short URL with valid input", async () => {
      const response = await request(app)
        .post("/api/v1/urls")
        .send({ originalUrl: "https://example.com" });

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty("id");
      expect(typeof response.body.id).toBe("string");
      expect(response.body).toHaveProperty("shortCode");
      expect(typeof response.body.shortCode).toBe("string");
      expect(response.body.originalUrl).toBe("https://example.com");
      expect(response.body).toHaveProperty("createdAt");
      expect(response.body.expiresAt).toBeNull();

      // Verify stored in PostgreSQL test schema
      const dbRecord = await prisma.url.findUnique({
        where: { shortCode: response.body.shortCode },
      });
      expect(dbRecord).not.toBeNull();
      expect(dbRecord?.originalUrl).toBe("https://example.com");
    });

    it("should successfully create a short URL with an expiration date", async () => {
      const futureDate = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

      const response = await request(app)
        .post("/api/v1/urls")
        .send({
          originalUrl: "https://example.com/expires",
          expiresAt: futureDate,
        });

      expect(response.status).toBe(201);
      expect(response.body.expiresAt).toBe(futureDate);
    });

    it("should return 400 Bad Request when originalUrl is missing", async () => {
      const response = await request(app)
        .post("/api/v1/urls")
        .send({});

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty("error", "Validation failed");
      expect(response.body).toHaveProperty("details");
      expect(Array.isArray(response.body.details)).toBe(true);
      expect(response.body.details[0].field).toBe("originalUrl");
    });

    it("should return 400 Bad Request when originalUrl is not a valid URL", async () => {
      const response = await request(app)
        .post("/api/v1/urls")
        .send({ originalUrl: "invalid-not-a-url" });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty("error", "Validation failed");
      expect(response.body.details[0].message).toBe("originalUrl must be a valid URL");
    });

    it("should return 400 Bad Request when expiresAt is not a valid ISO date", async () => {
      const response = await request(app)
        .post("/api/v1/urls")
        .send({
          originalUrl: "https://example.com",
          expiresAt: "invalid-date",
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty("error", "Validation failed");
    });

    it("should enforce rate limiting and return 429 after exceeding capacity", async () => {
      // Send 10 allowed requests
      for (let i = 0; i < 10; i++) {
        const res = await request(app)
          .post("/api/v1/urls")
          .send({ originalUrl: "https://example.com" });
        expect(res.status).toBe(201);
        expect(res.headers["x-ratelimit-limit"]).toBe("10");
      }

      // 11th request exceeds burst capacity
      const blockedRes = await request(app)
        .post("/api/v1/urls")
        .send({ originalUrl: "https://example.com" });

      expect(blockedRes.status).toBe(429);
      expect(blockedRes.body).toHaveProperty("error", "Too many requests. Please try again shortly.");
      expect(blockedRes.headers["x-ratelimit-remaining"]).toBe("0");
    });
  });

  describe("GET /:code", () => {
    it("should redirect (302) to the original URL for a valid short code", async () => {
      // 1. Create a short URL first
      const createRes = await request(app)
        .post("/api/v1/urls")
        .send({ originalUrl: "https://redirect-target.com" });

      expect(createRes.status).toBe(201);
      const { shortCode } = createRes.body;

      // 2. Request redirect
      const redirectRes = await request(app).get(`/${shortCode}`);

      expect(redirectRes.status).toBe(302);
      expect(redirectRes.header.location).toBe("https://redirect-target.com");

      // 3. Verify it was cached in Redis DB 1 as JSON { id, originalUrl }
      const cached = await redis.get(`url:${shortCode}`);
      expect(cached).not.toBeNull();
      const parsed = JSON.parse(cached!);
      expect(parsed.originalUrl).toBe("https://redirect-target.com");
      expect(parsed.id).toBe(createRes.body.id);
    });

    it("should record a ClickEvent and increment clickCount on redirect", async () => {
      const createRes = await request(app)
        .post("/api/v1/urls")
        .send({ originalUrl: "https://analytics-target.com" });

      const { shortCode, id } = createRes.body;

      await request(app)
        .get(`/${shortCode}`)
        .set("User-Agent", "Test-Agent-1.0")
        .set("Referer", "https://google.com");

      // Wait a moment for fire-and-forget async write
      await new Promise((resolve) => setTimeout(resolve, 150));

      const updatedUrl = await prisma.url.findUnique({
        where: { id: BigInt(id) },
        include: { clicks: true },
      });

      expect(updatedUrl).not.toBeNull();
      expect(Number(updatedUrl?.clickCount)).toBe(1);
      expect(updatedUrl?.clicks.length).toBe(1);
      expect(updatedUrl?.clicks[0].userAgent).toBe("Test-Agent-1.0");
      expect(updatedUrl?.clicks[0].referrer).toBe("https://google.com");
      expect(updatedUrl?.clicks[0].ipHash).toBeDefined();
    });

    it("should return 404 Not Found for a non-existent short code", async () => {
      const response = await request(app).get("/nonexistent-code-999");

      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty("error");
      expect(response.body.error).toContain("No URL found for short code");
    });

    it("should return 410 Gone for an expired short code", async () => {
      // Create an expired URL directly in the database
      const pastDate = new Date(Date.now() - 60 * 1000); // 1 minute in the past
      const id = BigInt(999999);
      const shortCode = "expiredCode1";

      await prisma.url.create({
        data: {
          id,
          shortCode,
          originalUrl: "https://expired-link.com",
          expiresAt: pastDate,
        },
      });

      const response = await request(app).get(`/${shortCode}`);

      expect(response.status).toBe(410);
      expect(response.body).toHaveProperty("error");
      expect(response.body.error).toContain("expired");
    });

    it("should serve subsequent redirect requests directly from Redis cache", async () => {
      const createRes = await request(app)
        .post("/api/v1/urls")
        .send({ originalUrl: "https://cached-example.com" });

      const { shortCode } = createRes.body;

      // First request - populates cache
      const firstRes = await request(app).get(`/${shortCode}`);
      expect(firstRes.status).toBe(302);

      // Verify cached in Redis
      const cached = await redis.get(`url:${shortCode}`);
      expect(cached).not.toBeNull();
      const parsed = JSON.parse(cached!);
      expect(parsed.originalUrl).toBe("https://cached-example.com");

      // Second request - hits cache
      const secondRes = await request(app).get(`/${shortCode}`);
      expect(secondRes.status).toBe(302);
      expect(secondRes.header.location).toBe("https://cached-example.com");
    });
  });
});
