# Production-Grade URL Shortener — Architecture, Decisions & Implementation Log

A comprehensive architectural record, technical decision log, and implementation guide for our production-level URL Shortener system.

---

## Table of Contents
1. [Executive Overview & Goals](#1-executive-overview--goals)
2. [Project Architecture & Directory Structure](#2-project-architecture--directory-structure)
3. [Technology Stack & Architectural Trade-offs (Why vs Why Not)](#3-technology-stack--architectural-trade-offs-why-vs-why-not)
4. [Core Engineering Logic & Data Flows](#4-core-engineering-logic--data-flows)
   - [Deterministic Base62 Encoding vs Random Strings](#41-deterministic-base62-encoding-vs-random-strings)
   - [Read Path & Cache-Aside Strategy](#42-read-path--cache-aside-strategy)
   - [Centralized Domain Error Handling](#43-centralized-domain-error-handling)
   - [Request Validation Layer](#44-request-validation-layer)
5. [Database Design & Schema Isolation](#5-database-design--schema-isolation)
6. [Testing Strategy & Supertest Harness](#6-testing-strategy--supertest-harness)
7. [Comprehensive Step-by-Step Changelog (What We Built)](#7-comprehensive-step-by-step-changelog-what-we-built)
8. [Next Milestones & Future Roadmap](#8-next-milestones--future-roadmap)

---

## 1. Executive Overview & Goals

The goal of this system is to build an enterprise-ready, high-throughput, low-latency URL shortener capable of handling millions of redirects while maintaining data integrity, atomicity, high cache hit ratios, and zero code collisions.

### Key Non-Functional Requirements:
* **Sub-millisecond Read Latency**: 95%+ of redirects served directly from Redis in-memory cache.
* **Deterministic, Non-Colliding Write Path**: PostgreSQL sequence reservation + Base62 conversion eliminate insertion collision retry loops.
* **Strict Layer Separation**: Decoupled Controllers, Services, Repositories, Middlewares, and Utilities.
* **Complete Test Isolation**: Dedicated test schema (`url_shortener_test`) and Redis DB index 1 with automated cleanup between test runs.

---

## 2. Project Architecture & Directory Structure

```
url-shortener/
├── prisma/
│   ├── migrations/               # PostgreSQL migration history
│   └── schema.prisma             # Data models & generator definitions
├── src/
│   ├── config/
│   │   ├── env.ts                # Validated environment variables
│   │   ├── prisma.ts             # Prisma 7 client with @prisma/adapter-pg
│   │   └── redis.ts              # ioredis singleton client
│   ├── controllers/
│   │   └── url.controller.ts     # HTTP request handling & response mapping
│   ├── generated/
│   │   └── prisma/               # Generated Prisma 7 type-safe client
│   ├── middleware/
│   │   ├── errorHandler.ts       # Centralized error formatting middleware
│   │   └── validate.ts           # Reusable generic Zod validation middleware
│   ├── repositories/
│   │   └── url.repository.ts     # Data Access Layer (Prisma SQL queries)
│   ├── routes/
│   │   ├── redirect.routes.ts    # Top-level GET /:code redirect route
│   │   └── url.routes.ts         # API routes: POST /api/v1/urls
│   ├── services/
│   │   └── url.service.ts        # Core business rules & cache-aside logic
│   ├── types/
│   │   └── url.types.ts          # Request DTOs, Response DTOs & Contracts
│   ├── utils/
│   │   ├── base62.ts             # Pure BigInt Base62 encoder
│   │   └── shortCode.ts          # Legacy random token generator (reference)
│   ├── validators/
│   │   └── url.validator.ts      # Zod validation schemas
│   ├── app.ts                    # Express app assembly (no listening socket)
│   └── server.ts                 # Entrypoint starting HTTP server on PORT
├── tests/
│   ├── setup.ts                  # Jest global setup & teardown (DB/Redis reset)
│   └── url.test.ts               # Supertest integration test suite
├── .env                          # Development environment secrets
├── .env.test                     # Isolated test environment config
├── docker-compose.yml            # Local Redis & PostgreSQL containers
├── jest.config.ts                # Jest configuration with @swc/jest
├── package.json                  # Dependencies & scripts
└── tsconfig.json                 # TypeScript compiler configuration
```

---

## 3. Technology Stack & Architectural Trade-offs (Why vs Why Not)

| Component | Selected Technology | Alternatives Evaluated | Why Selected | Why Alternatives Were Rejected |
| :--- | :--- | :--- | :--- | :--- |
| **Language & Runtime** | **Node.js (v22) + TypeScript (Strict)** | Python / Go / Rust / Plain JS | Rapid ecosystem velocity, strong typing, native async I/O perfect for I/O-bound proxying. | Plain JS lacks compile-time contract enforcement; Go/Rust increase boilerplate for rapid domain iteration. |
| **Web Framework** | **Express.js (v5)** | NestJS, Fastify, Koa, Hono | Minimal overhead, unopinionated routing, ubiquitous middleware ecosystem, full control over lifecycle. | NestJS introduces heavy DI and annotation overhead; Fastify has smaller plugin ecosystem; Express 5 has native async error propagation. |
| **Database & ORM** | **PostgreSQL (Supabase) + Prisma 7** | TypeORM, Drizzle, Raw `pg`, MongoDB | PostgreSQL provides ACID transactions, native atomic sequences (`nextval`), and relational constraints. Prisma 7 provides complete type safety and generated client with WebAssembly/driver adapters. | MongoDB lacks atomic global sequences across shards without counter collections; TypeORM has brittle migration tooling; Drizzle has less mature schema migration ecosystem. |
| **Short Code Generation** | **Atomic Sequence + Base62** | MD5 / SHA-256 Hashing, UUIDs, Random Char Generator | Zero collision probability ($O(1)$ lookup and insert), compact URL representation (1-7 characters), perfectly deterministic. | Hashing requires truncation (collision risk requiring DB checks); UUID is 36 characters (too long for a shortener); Random tokens suffer birthday paradox collisions at scale. |
| **In-Memory Cache** | **Redis (ioredis)** | Memcached, In-Memory Node Map (LRU Cache) | High throughput, TTL support per-key, distributed across multiple app instances, atomic operations, Lua scripting support for rate limiting. | In-memory Node Maps don't scale across multiple horizontal instances and vanish on restart; Memcached lacks rich data structures and Lua scripting. |
| **Validation Layer** | **Zod (v4)** | Joi, express-validator, class-validator | Schema-first TypeScript type inference, zero runtime dependencies, composable pipelines. | Joi lacks seamless TypeScript type inference; class-validator requires experimental decorators and reflection metadata. |
| **Test Framework & Runner** | **Jest + Supertest + `@swc/jest`** | Mocha + Chai, Vitest, ts-jest | Supertest tests HTTP behavior in-memory without binding TCP ports. `@swc/jest` provides instant compilation compatible with modern TypeScript. | `ts-jest` depends on legacy TypeScript JS compiler APIs incompatible with TypeScript 7 native builds; Mocha requires piecemeal assertion/mocking libraries. |

---

## 4. Core Engineering Logic & Data Flows

### 4.1. Deterministic Base62 Encoding vs Random Strings

```
[ POST /api/v1/urls ]
         │
         ▼
[ Prisma / PostgreSQL ] ──> SELECT nextval(pg_get_serial_sequence('urls', 'id'))
         │                  (Atomically reserves next 64-bit BigInt ID e.g. 125348)
         ▼
[ Base62 Encoder ] ───────> Math: Repeated division by 62
         │                  Number 125348 ──> "wz8"
         ▼
[ Insert Row in DB ] ─────> INSERT INTO urls (id, shortCode, originalUrl) VALUES (125348, 'wz8', ...)
         │                  (Guaranteed unique, 0% collision rate, no retries)
         ▼
[ Response 201 Created ] ──> { id: "125348", shortCode: "wz8", ... }
```

#### Why Base62?
* Standard alphabet: `[0-9, A-Z, a-z]` (62 characters).
* URL-safe: Contains no characters that require percent-encoding (`/`, `?`, `&`, `+`, `=`).
* Capacity:
  * 1 character = 62 URLs
  * 4 characters = $62^4 \approx 14.7\text{ million}$ URLs
  * 7 characters = $62^7 \approx 3.52\text{ trillion}$ URLs

---

### 4.2. Read Path & Cache-Aside Strategy

```
[ Incoming GET /:code ]
          │
          ▼
   [ Check Redis ] ─── (Key: url:<shortCode>)
          │
   ┌──────┴───────────────┐
   ▼                      ▼
[ Cache Hit ]        [ Cache Miss ]
   │                      │
   │                      ▼
   │             [ Query PostgreSQL ]
   │                      │
   │               ┌──────┴───────────────┐
   │               ▼                      ▼
   │        [ Record Found ]       [ Not Found / Expired ]
   │               │                      │
   │               ▼                      ▼
   │      [ Calculate TTL ]          [ Throw NotFoundError (404) ]
   │      TTL = min(1h, expiresAt)   [ Throw GoneError (410) ]
   │               │
   │               ▼
   │      [ Write to Redis ]
   │      SET url:<code > <url> EX <ttl>
   │               │
   └───────────────┼──────────────────────┐
                   │
                   ▼
         [ HTTP 302 Redirect ]
       Location: https://original.url
```

#### Why 302 Found instead of 301 Moved Permanently?
* **301 (Permanent)**: Cached aggressively by browsers forever. If the link destination is updated, expires, or if analytics are required, the browser bypasses our server.
* **302 (Found / Temporary)**: Ensures all clicks hit our proxy layer, guaranteeing link expiration enforcement and accurate analytics.

---

### 4.3. Centralized Domain Error Handling

Instead of writing `try/catch` and ad-hoc error formatting in every route, domain errors inherit from standard classes:
* `NotFoundError` $\rightarrow$ status `404`
* `GoneError` $\rightarrow$ status `410`
* `ZodError` / Validation $\rightarrow$ status `400`
* Unhandled exception $\rightarrow$ status `500` (`"Internal server error"`)

All errors pass to `src/middleware/errorHandler.ts`, creating a single location for security sanitization, observability, and structured logging.

---

### 4.4. Request Validation Layer

The validation middleware (`src/middleware/validate.ts`) is a higher-order middleware factory:
```typescript
router.post("/urls", validate(createUrlSchema), UrlController.createUrl);
```
If validation fails, the controller never executes, preventing malformed URLs from entering PostgreSQL.

---

## 5. Database Design & Schema Isolation

### PostgreSQL Schema (`prisma/schema.prisma`):

```prisma
model User {
  id        String       @id @default(uuid())
  email     String       @unique
  createdAt DateTime     @default(now())
  updatedAt DateTime     @updatedAt
  urls      Url[]
  @@map("users")
}

model Url {
  id          BigInt       @id @default(autoincrement())
  shortCode   String       @unique
  originalUrl String       @db.Text
  userId      String?
  user        User?        @relation(fields: [userId], references: [id], onDelete: SetNull)
  clickCount  BigInt       @default(0)
  createdAt   DateTime     @default(now())
  updatedAt   DateTime     @updatedAt
  expiresAt   DateTime?
  clicks      ClickEvent[]
  @@index([userId])
  @@index([expiresAt])
  @@map("urls")
}

model ClickEvent {
  id         String       @id @default(uuid())
  urlId      BigInt
  url        Url          @relation(fields: [urlId], references: [id], onDelete: Cascade)
  clickedAt  DateTime     @default(now())
  ipHash     String?
  userAgent  String?      @db.Text
  referrer   String?      @db.Text
  country    String?
  deviceType String?
  @@index([urlId])
  @@index([urlId, clickedAt])
  @@map("click_events")
}
```

### BigInt JSON Serialization Safety
JavaScript `JSON.stringify` throws a `TypeError: Do not know how to serialize a BigInt` on raw BigInts. Our response DTO layer converts `Url.id` and `ClickEvent.urlId` to strings (`id: url.id.toString()`) before returning HTTP responses.

### Environment & Test Isolation:
* **Development Database**: `public` schema.
* **Test Database**: `url_shortener_test` schema (isolated using `?schema=url_shortener_test` in `.env.test`).
* **Test Redis**: Redis database index `1` (`redis://localhost:6379/1`).

---

## 6. Testing Strategy & Supertest Harness

### Principles:
1. **Black-Box HTTP Interface Testing**: Tests make real HTTP calls using `supertest(app)` without mocking Prisma or Redis.
2. **Deterministic Cleanup**: `tests/setup.ts` truncates tables in foreign-key order (`ClickEvent` $\rightarrow$ `Url` $\rightarrow$ `User`) and flushes Redis DB 1 before each test.
3. **No Port Binding**: `app.ts` is imported without starting `server.ts`, allowing parallel and ephemeral test runs.

---

## 7. Comprehensive Step-by-Step Changelog (What We Built)

1. **Prisma 7 & Supabase Setup**:
   - Initialized PostgreSQL connection pooler and session pooler (`DATABASE_URL`, `DIRECT_URL`).
   - Configured Prisma 7 client with `@prisma/adapter-pg` driver adapter.
2. **Request / Response Contracts**:
   - Created `src/types/url.types.ts` (`CreateUrlInput`, `UrlResponseDTO`).
3. **Base62 Algorithm & Atomic Sequence**:
   - Built `src/utils/base62.ts` encoding BigInt sequence numbers.
   - Built `UrlRepository.getNextId()` calling `nextval(pg_get_serial_sequence('urls', 'id'))`.
   - Built `UrlRepository.createWithId()`.
4. **Business Logic & Error Architecture**:
   - Built `UrlService` with `createShortUrl` and `resolveShortUrl`.
   - Created `NotFoundError` (404) and `GoneError` (410).
5. **Controllers & Routing**:
   - Created `src/controllers/url.controller.ts`.
   - Created `src/routes/url.routes.ts` (`POST /api/v1/urls`).
   - Created `src/routes/redirect.routes.ts` (`GET /:code`).
   - Separated top-level short link route from versioned `/api/v1` API route.
6. **Centralized Middleware**:
   - Created `src/middleware/errorHandler.ts`.
   - Created `src/validators/url.validator.ts` and `src/middleware/validate.ts` with Zod v4.
7. **In-Memory Caching with Redis**:
   - Added `redis:7-alpine` in `docker-compose.yml`.
   - Built `src/config/redis.ts` using `ioredis`.
   - Integrated cache-aside pattern with dynamic expiration TTL calculation.
8. **Automated Testing Suite**:
   - Configured Jest with `@swc/jest` in `jest.config.ts`.
   - Created `tests/setup.ts` and `tests/url.test.ts` with complete database and Redis DB 1 isolation.
9. **Atomic Token Bucket Rate Limiting (Phase 5)**:
   - Built `src/utils/tokenBucket.lua.ts` executing atomic token bucket algorithm in Redis via `EVAL`.
   - Created `src/middleware/rateLimit.ts` setting `X-RateLimit-Limit` & `X-RateLimit-Remaining` headers.
   - Enforces burst limit (10 reqs) and sustained refill (10/min) returning `429 Too Many Requests`.
10. **Asynchronous Click Analytics Tracking (Phase 4)**:
   - Updated Redis cache shape from raw string to JSON `{ id, originalUrl }`, eliminating database lookups on cache hits for analytics.
   - Built `src/utils/hash.ts` for SHA-256 IP hashing (GDPR/privacy-friendly telemetry).
   - Created `src/repositories/clickEvent.repository.ts` and `UrlRepository.incrementClickCount(id)`.
   - Built `src/services/analytics.service.ts` to record user-agent, referrer, and IP hash in fire-and-forget mode without blocking redirects.
11. **GitHub Actions CI/CD Pipeline (Phase 7)**:
    - Created `.github/workflows/ci.yml` running ephemeral `postgres:16` and `redis:7-alpine` service containers.
    - Zero external secrets dependencies — creates isolated disposable database for every commit and PR.
    - Added `"test:ci": "jest --runInBand"` to `package.json`.

---

## 8. Next Milestones & Future Roadmap

* [x] **Phase 4: Click Analytics & Background Tracking** (Completed)
* [x] **Phase 5: Rate Limiting & Abuse Prevention** (Completed)
* [x] **Phase 7: CI/CD GitHub Actions Workflow** (Completed)
* [ ] **Phase 6: User Authentication & JWT Ownership**
  - User registration, login, JWT validation middleware, user-scoped URLs.
* [ ] **Multi-stage Production Dockerfile**
  - Minimal Alpine container bundle with health checks.
