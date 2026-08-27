import { prisma } from "../src/config/prisma";
import { redis } from "../src/config/redis";

async function cleanDatabase() {
  // Delete in order to respect foreign-key constraints
  await prisma.clickEvent.deleteMany();
  await prisma.url.deleteMany();
  await prisma.user.deleteMany();

  // Clean only Redis DB 1 (the currently connected test db)
  if (redis.status === "ready" || redis.status === "connect") {
    await redis.flushdb();
  }
}

beforeAll(async () => {
  await cleanDatabase();
});

beforeEach(async () => {
  await cleanDatabase();
});

afterAll(async () => {
  await cleanDatabase();
  await prisma.$disconnect();
  await redis.quit();
});
