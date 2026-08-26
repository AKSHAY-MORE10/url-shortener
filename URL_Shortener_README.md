# URL Shortener — Production-Grade Distributed URL Service

A production-oriented URL shortening service inspired by Bitly, built to understand backend engineering, distributed systems, caching, database indexing, concurrency, performance optimization, and system design.

The project starts as a simple URL shortener and progressively evolves into a scalable service with PostgreSQL, Redis, rate limiting, analytics, Docker, automated testing, observability, and load testing.

---

## 1. Project Overview

A URL shortener converts a long URL such as:

```text
https://example.com/products/category/electronics/product?id=123456789
```

into a short URL:

```text
https://short.ly/aB92xK
```

When a user accesses:

```text
GET /aB92xK
```

the service finds the original URL and redirects the user.

### Core flow

```text
Long URL
    |
    v
URL Validation
    |
    v
Generate Unique ID
    |
    v
Base62 Encoding
    |
    v
PostgreSQL
    |
    v
Redis Cache
    |
    v
Short URL
```

Redirect:

```text
Short URL
    |
    v
Redis
    |
    +-- Cache HIT ------> Redirect
    |
    +-- Cache MISS
            |
            v
       PostgreSQL
            |
            v
          Redis
            |
            v
         Redirect
```

---

## 2. Goals

The goal is not simply to create a working URL shortener.

The project is designed to understand:

- REST API design
- Database modeling
- Database indexing
- Unique constraints
- Base62 encoding
- Collision handling
- Redis caching
- Cache-aside architecture
- Rate limiting
- Concurrency
- Horizontal scaling
- Load balancing
- Distributed systems concepts
- Observability
- Performance testing
- Docker
- CI/CD
- Production deployment
- System-design tradeoffs

---

## 3. Why Build This Project?

URL shorteners look simple but contain several interesting engineering problems.

At small scale:

```text
Client
  |
  v
API
  |
  v
Database
```

At larger scale:

```text
                  Internet
                     |
                     v
               Load Balancer
                     |
          +----------+----------+
          |          |          |
          v          v          v
        API 1      API 2      API 3
          |          |          |
          +----------+----------+
                     |
              +------+------+
              |             |
              v             v
            Redis       PostgreSQL
```

The project allows us to progressively understand why these additional components are required.

---

## 4. Key Engineering Questions

### Why PostgreSQL?

Because URL mappings are structured data and we benefit from:

- Unique constraints
- Transactions
- Indexes
- Strong consistency
- Reliable querying

### Why Redis?

Because redirect traffic can be extremely high.

Instead of:

```text
1,000,000 requests
        |
        v
1,000,000 database queries
```

we want:

```text
1,000,000 requests
        |
        v
      Redis
        |
        +-- ~950,000 cache hits
        |
        +-- ~50,000 database queries
```

### Why Base62?

Base62 provides compact, URL-safe identifiers using:

```text
a-z
A-Z
0-9
```

### Why not hash the URL?

Hashing the original URL can introduce collision-handling complexity when truncating the hash to create a short code.

Instead:

```text
Database ID
     |
     v
  Base62
     |
     v
Short Code
```

provides a predictable uniqueness strategy.

### Why not store everything in Redis?

Redis is a cache.

PostgreSQL remains the source of truth.

If Redis disappears:

```text
Redis       X
PostgreSQL  OK
```

the application can rebuild the cache.

---

## 5. Features

### Core Features

- Create short URLs
- Redirect short URLs
- Unique short-code generation
- URL validation
- PostgreSQL persistence
- Redis caching
- Cache expiration
- Collision handling
- URL expiration
- Click tracking
- User ownership

### Security

- Rate limiting
- Input validation
- Request size limits
- Security headers
- CORS configuration
- Abuse prevention
- Authentication

### Engineering

- Unit testing
- Integration testing
- API testing
- Load testing
- Docker
- CI/CD
- Logging
- Metrics
- Health checks

---

## 6. Final Technology Stack

### Backend

```text
Node.js
TypeScript
Express.js
```

TypeScript provides:

- Static typing
- Better IDE support
- Safer refactoring
- Better maintainability
- Clear API contracts

### Database

```text
PostgreSQL
```

Used as the primary persistent database.

Responsibilities:

- URL mappings
- Users
- URL metadata
- Analytics metadata
- Expiration information

### Cache

```text
Redis
```

Used for:

- URL lookup caching
- Rate limiting
- TTL
- Counters
- Hot URL optimization

### ORM

```text
Prisma
```

Used for:

- Database schema
- Type-safe queries
- Migrations
- Database access

### Validation

```text
Zod
```

Used for:

- Request validation
- URL validation
- Environment validation
- API input contracts

### Testing

```text
Jest
Supertest
```

Used for:

- Unit tests
- Integration tests
- API tests

### Load Testing

```text
Autocannon
```

Used to measure:

- Requests/second
- Latency
- Throughput
- Performance under concurrency

### Infrastructure

```text
Docker
Docker Compose
```

Used to containerize:

- API
- PostgreSQL
- Redis

### CI/CD

```text
GitHub Actions
```

Pipeline:

```text
Push
 |
 v
Lint
 |
 v
Type Check
 |
 v
Unit Tests
 |
 v
Integration Tests
 |
 v
Build
 |
 v
Docker Build
```

---

## 7. Final Architecture

```text
                         +---------------+
                         |    Client     |
                         | Browser / App |
                         +-------+-------+
                                 |
                                 v
                         +---------------+
                         | Load Balancer |
                         | / Reverse     |
                         | Proxy         |
                         +-------+-------+
                                 |
                     +-----------+-----------+
                     |                       |
                     v                       v
             +---------------+       +---------------+
             | API Server 1  |       | API Server 2  |
             | Node.js       |       | Node.js       |
             +-------+-------+       +-------+-------+
                     |                       |
                     +-----------+-----------+
                                 |
                    +------------+------------+
                    |                         |
                    v                         v
              +-----------+           +--------------+
              |   Redis   |           |  PostgreSQL  |
              |   Cache   |           |   Primary    |
              +-----------+           +------+-------+
                                            |
                                            v
                                      +-----------+
                                      |  Backups  |
                                      +-----------+
```

---

## 8. High-Level Architecture

The system consists of:

```text
Client
   |
   v
Load Balancer
   |
   v
API Layer
   |
   v
Business Logic
   |
   v
Cache Layer
   |
   v
Persistence Layer
```

### API Layer

Responsible for:

- HTTP requests
- Authentication
- Validation
- HTTP responses

### Service Layer

Responsible for:

- Business logic
- Short-code generation
- Cache strategy
- URL lifecycle

### Repository Layer

Responsible for:

- Database operations
- Queries
- Persistence

### Infrastructure Layer

Responsible for:

- PostgreSQL
- Redis
- Docker
- Logging
- Configuration

---

## 9. Project Structure

```text
url-shortener/
|
+-- src/
|   |
|   +-- config/
|   |   +-- env.ts
|   |   +-- database.ts
|   |   +-- redis.ts
|   |
|   +-- controllers/
|   |   +-- url.controller.ts
|   |
|   +-- services/
|   |   +-- url.service.ts
|   |   +-- cache.service.ts
|   |   +-- analytics.service.ts
|   |
|   +-- repositories/
|   |   +-- url.repository.ts
|   |
|   +-- middleware/
|   |   +-- auth.middleware.ts
|   |   +-- rateLimit.middleware.ts
|   |   +-- validation.middleware.ts
|   |   +-- error.middleware.ts
|   |   +-- requestLogger.middleware.ts
|   |
|   +-- routes/
|   |   +-- url.routes.ts
|   |   +-- health.routes.ts
|   |
|   +-- utils/
|   |   +-- base62.ts
|   |   +-- logger.ts
|   |   +-- errors.ts
|   |
|   +-- types/
|   |   +-- url.types.ts
|   |
|   +-- app.ts
|   +-- server.ts
|
+-- prisma/
|   +-- schema.prisma
|   +-- migrations/
|
+-- tests/
|   +-- unit/
|   +-- integration/
|   +-- e2e/
|
+-- scripts/
|   +-- seed.ts
|
+-- docker/
|   +-- ...
|
+-- docker-compose.yml
+-- Dockerfile
+-- .env.example
+-- package.json
+-- tsconfig.json
+-- jest.config.ts
+-- README.md
```

---

## 10. Database Design

### URL Table

```text
urls
------------------------------------------------
id
short_code
original_url
user_id
click_count
created_at
updated_at
expires_at
```

Example:

```text
id:            92831
short_code:    aB92xK
original_url:  https://example.com/article
user_id:       123
click_count:   1542
created_at:    ...
expires_at:    ...
```

---

## 11. Database Constraints

The most important constraint:

```text
short_code UNIQUE
```

This prevents:

```text
aB92xK
aB92xK
```

from existing twice.

We also create an index:

```text
INDEX(short_code)
```

because the most common lookup is:

```sql
SELECT *
FROM urls
WHERE short_code = 'aB92xK';
```

---

## 12. URL Creation Algorithm

Input:

```text
Original URL
```

### Step 1

Validate the URL.

### Step 2

Create or allocate a unique identifier.

Example:

```text
Database ID = 92831
```

### Step 3

Convert ID to Base62.

```text
92831
  |
  v
Base62
  |
  v
aB92xK
```

### Step 4

Persist the mapping.

### Step 5

Return:

```text
https://short.ly/aB92xK
```

---

## 13. Base62 Encoding

Character set:

```text
0123456789
abcdefghijklmnopqrstuvwxyz
ABCDEFGHIJKLMNOPQRSTUVWXYZ
```

Base62 provides 62 possible characters.

For a number N:

```text
remainder = N % 62
N = N / 62
```

Repeat until N becomes zero, then reverse the generated characters.

---

## 14. Redirect Algorithm

Request:

```text
GET /aB92xK
```

### Step 1

Check Redis:

```text
GET url:aB92xK
```

### Step 2

If cache hit:

```text
Return redirect
```

### Step 3

If cache miss:

```text
Query PostgreSQL
```

### Step 4

Store the result in Redis:

```text
SET url:aB92xK <original_url> EX 3600
```

### Step 5

Redirect the user.

---

## 15. Cache Strategy

We use the Cache-Aside Pattern.

```text
Application
    |
    v
Check Redis
    |
 +--+--+
 |     |
Hit   Miss
 |     |
 |     v
 |  PostgreSQL
 |     |
 |     v
 |   Redis
 |     |
 +--+--+
    |
    v
Return URL
```

### Why Cache-Aside?

The application explicitly controls:

- when data enters the cache
- when data expires
- when cache is invalidated

It also keeps PostgreSQL as the source of truth.

---

## 16. Redis Key Design

URL cache:

```text
url:aB92xK
```

Value:

```text
https://example.com/article
```

TTL:

```text
3600 seconds
```

Rate limiting:

```text
rate_limit:user:123
```

Analytics:

```text
clicks:aB92xK
```

---

## 17. Rate Limiting

Example:

```text
100 requests / minute / IP
```

Flow:

```text
Request
   |
   v
Redis
   |
   v
Counter
   |
   v
Limit?
  / \
 No  Yes
 |    |
 v    v
API  429
```

Response:

```http
HTTP/1.1 429 Too Many Requests
```

---

## 18. Why Redis for Rate Limiting?

An in-memory JavaScript object:

```javascript
const requests = {};
```

works only for one server.

With multiple servers:

```text
Server 1 -> counter = 50
Server 2 -> counter = 30
```

the system doesn't have a global count.

Redis provides shared state:

```text
Server 1 --+
Server 2 --+--> Redis
Server 3 --+
```

---

## 19. API Design

### Create Short URL

```http
POST /api/v1/urls
```

Request:

```json
{
  "url": "https://example.com/very/long/url"
}
```

Response:

```json
{
  "shortCode": "aB92xK",
  "shortUrl": "https://short.ly/aB92xK"
}
```

### Redirect

```http
GET /:shortCode
```

Example:

```text
GET /aB92xK
```

Response:

```http
302 Found
Location: https://example.com/article
```

### Get URL Information

```http
GET /api/v1/urls/:shortCode
```

Response:

```json
{
  "shortCode": "aB92xK",
  "originalUrl": "https://example.com/article",
  "clickCount": 1542,
  "createdAt": "2026-08-26T10:00:00Z"
}
```

### Delete URL

```http
DELETE /api/v1/urls/:shortCode
```

### Health Check

```http
GET /health
```

Response:

```json
{
  "status": "healthy",
  "database": "connected",
  "redis": "connected"
}
```

---

## 20. Authentication

Optional authenticated users can manage their URLs.

```text
User
 |
 v
JWT
 |
 v
API
 |
 v
User's URLs
```

Users can:

- Create URLs
- View URLs
- Delete URLs
- View analytics

---

## 21. Security

The service should implement:

### Input validation

Reject malformed URLs.

### Rate limiting

Prevent API abuse.

### Request size limits

Prevent oversized requests.

### Security headers

Use appropriate HTTP security headers.

### CORS

Restrict allowed origins.

### Authentication

Protect user-specific endpoints.

### URL protocol restrictions

Allow:

```text
http://
https://
```

Reject dangerous protocols such as:

```text
javascript:
data:
```

---

## 22. Analytics

Each redirect can generate an event.

```text
Short URL
    |
    v
Redirect
    |
    +---------> User
    |
    v
Analytics Event
    |
    v
Click Data
```

Potential data:

```text
timestamp
IP hash
user agent
referrer
country
device type
```

For a production system, analytics should ideally be asynchronous so redirect latency is not heavily affected.

Potential future architecture:

```text
Redirect
   |
   +---------> User
   |
   v
Event Queue
   |
   v
Analytics Worker
   |
   v
Analytics DB
```

Potential technologies:

```text
Kafka
RabbitMQ
Redis Streams
```

These are future extensions, not required for V1.

---

## 23. Observability

The application should expose metrics such as:

```text
Total Requests
Requests / Second
Average Latency
P95 Latency
P99 Latency
Cache Hit Rate
Cache Miss Rate
Database Latency
Error Rate
429 Responses
Redirect Count
```

Example:

```text
Requests/sec:       1,250
Average latency:       12ms
P95 latency:           28ms
P99 latency:           51ms
Redis hit rate:        94%
Error rate:           0.12%
```

---

## 24. Logging

Every request should have a request ID.

Example:

```text
request_id: 7f82c9
method: GET
path: /aB92xK
status: 302
latency: 8ms
cache: HIT
```

This makes debugging much easier.

---

## 25. Failure Handling

Production systems must assume components can fail.

### Redis fails

Fallback:

```text
Redis X
   |
   v
PostgreSQL
```

The application should remain functional.

### PostgreSQL fails

Return an appropriate error instead of crashing.

### Invalid short code

Return:

```http
404 Not Found
```

### Expired URL

Return:

```http
410 Gone
```

---

## 26. Horizontal Scaling

One server:

```text
Client
 |
 v
API
```

Multiple servers:

```text
             Load Balancer
              /    |    \
             /     |     \
           API    API    API
```

The API servers must remain stateless.

Do not store important application state in local server memory.

Use:

```text
Redis
PostgreSQL
```

for shared state.

---

## 27. Why Stateless Servers?

Suppose:

```text
User -> Server 1
```

stores state in memory.

Next request:

```text
User -> Server 2
```

Server 2 doesn't know about it.

Instead:

```text
Server 1 --+
Server 2 --+--> Redis/PostgreSQL
Server 3 --+
```

Now every server can access shared state.

---

## 28. Docker Architecture

Development environment:

```text
Docker Compose
|
+-- API
|
+-- PostgreSQL
|
+-- Redis
```

Example:

```text
localhost:3000 -> API
localhost:5432 -> PostgreSQL
localhost:6379 -> Redis
```

---

## 29. Environment Variables

Example:

```env
NODE_ENV=development

PORT=3000

DATABASE_URL=postgresql://user:password@postgres:5432/urlshortener

REDIS_URL=redis://redis:6379

BASE_URL=http://localhost:3000

JWT_SECRET=your-secret
```

Never commit real secrets.

Use:

```text
.env
```

and provide:

```text
.env.example
```

---

## 30. Testing Strategy

### Unit Tests

Test isolated functions:

```text
Base62 encode
Base62 decode
URL validation
Code generation
```

### Integration Tests

Test:

```text
API
 |
 v
PostgreSQL
 |
 v
Redis
```

### End-to-End Tests

Test:

```text
Create URL
 |
 v
Receive short URL
 |
 v
Visit short URL
 |
 v
Redirect
```

---

## 31. Load Testing

Use Autocannon.

### Scenario 1

```text
100 concurrent requests
```

### Scenario 2

```text
500 concurrent requests
```

### Scenario 3

```text
1000 concurrent requests
```

Compare:

```text
PostgreSQL only
```

versus:

```text
Redis + PostgreSQL
```

Important metrics:

```text
Requests/sec
Latency
P95
P99
Errors
```

---

## 32. Performance Experiment

One of the most valuable parts of the project is measuring the effect of caching.

### Experiment A

```text
Client
 |
 v
API
 |
 v
PostgreSQL
```

Measure:

```text
Average latency
P95
P99
Requests/sec
```

### Experiment B

```text
Client
 |
 v
API
 |
 v
Redis
 |
 v
PostgreSQL on cache miss
```

Measure again.

Then calculate:

- Performance improvement
- Cache hit rate
- Database load reduction
- Redirect latency improvement

This turns the project from:

> "I built a URL shortener."

into:

> "I implemented cache-aside caching and measured its effect on database reads and redirect latency under concurrent load."

---

## 33. CI/CD Pipeline

```text
Developer
    |
    v
Git Push
    |
    v
GitHub
    |
    v
GitHub Actions
    |
    +-- ESLint
    |
    +-- TypeScript
    |
    +-- Unit Tests
    |
    +-- Integration Tests
    |
    +-- Build
    |
    +-- Docker Build
    |
    v
Deploy
```

---

## 34. Development Phases

### Phase 1 — Basic API

Build:

```text
POST /urls
GET /:shortCode
```

Learn:

- Express
- HTTP
- REST
- Controllers
- Services

### Phase 2 — PostgreSQL

Add:

```text
PostgreSQL
Prisma
Indexes
Constraints
```

Learn:

- Relational databases
- SQL
- Indexing
- Transactions

### Phase 3 — Base62

Implement:

```text
ID -> Base62 -> Short Code
```

Learn:

- Encoding
- Algorithms
- Uniqueness

### Phase 4 — Redis

Add:

```text
Redis
Cache-aside
TTL
```

Learn:

- Caching
- Cache invalidation
- Performance optimization

### Phase 5 — Rate Limiting

Add:

```text
Redis-based rate limiter
```

Learn:

- Token Bucket
- Sliding Window
- Concurrency
- Distributed state

### Phase 6 — Authentication

Add:

```text
JWT
Users
Ownership
```

### Phase 7 — Analytics

Add:

```text
Click tracking
Events
Metrics
```

### Phase 8 — Testing

Add:

```text
Jest
Supertest
Integration tests
```

### Phase 9 — Docker

Containerize:

```text
API
PostgreSQL
Redis
```

### Phase 10 — Load Testing

Use:

```text
Autocannon
```

Measure:

```text
Latency
Throughput
Cache performance
```

### Phase 11 — Horizontal Scaling

Run:

```text
API x 2
API x 3
API x 5
```

Introduce:

```text
Load Balancer
```

### Phase 12 — Production Deployment

Deploy with:

```text
HTTPS
Environment variables
Monitoring
Logging
Health checks
```

---

## 35. Production Architecture vs MVP

| Component | MVP | Production |
|---|---|---|
| API | 1 instance | Multiple instances |
| Database | PostgreSQL | PostgreSQL + backups |
| Cache | Redis | Redis |
| Load Balancer | No | Yes |
| Rate Limiter | Optional | Required |
| Authentication | Optional | Required for user APIs |
| Analytics | Basic | Async pipeline |
| Docker | Optional | Yes |
| Monitoring | Basic logs | Metrics + logs |
| Testing | Basic | Unit + Integration + Load |
| CI/CD | Optional | GitHub Actions |

---

## 36. Important Trade-offs

### PostgreSQL vs MongoDB

PostgreSQL provides:

- Strong constraints
- Indexes
- Transactions
- Structured data

Chosen for this project.

### Redis vs In-Memory Cache

In-memory cache:

Pros:

- Very fast

Cons:

- Not shared across servers
- Lost when server restarts

Redis:

- Shared
- TTL support
- Atomic operations
- Distributed support

### Sequential ID vs Random ID

Sequential:

Pros:

- Simple
- Fast
- Easy uniqueness
- Base62 friendly

Cons:

- Predictable

Random:

Pros:

- Harder to enumerate

Cons:

- Collision probability
- Requires collision handling

### Monolith vs Microservices

We'll start with a modular monolith.

Microservices introduce:

- More network communication
- More deployment complexity
- Distributed debugging
- More operational overhead

For this project, a well-structured monolith is sufficient.

Microservices can be explored later when there is a real scaling or ownership reason.

---

## 37. Learning Outcomes

After completing the project, you should understand:

### Backend

- Node.js
- Express
- REST APIs
- Middleware
- HTTP
- Authentication

### Databases

- PostgreSQL
- SQL
- Indexes
- Constraints
- Transactions
- Query optimization

### Distributed Systems

- Stateless services
- Shared state
- Horizontal scaling
- Load balancing
- Caching
- Failure handling

### Algorithms

- Base62
- Hashing
- Collision handling
- Token Bucket
- Sliding Window

### Infrastructure

- Docker
- Docker Compose
- CI/CD
- Environment configuration

### Performance

- Load testing
- Latency
- Throughput
- P95/P99
- Cache hit ratio

### Production Engineering

- Logging
- Monitoring
- Health checks
- Security
- Error handling

---

## 38. AI/ML Engineering Extensions

The core URL shortener does not need AI. However, the system can later be extended with meaningful ML components.

### Abuse Detection

Train a model to detect suspicious URL creation patterns.

Potential features:

```text
request frequency
domain reputation
URL length
special characters
user behavior
creation frequency
```

Output:

```text
risk_score = 0.94
```

### Malicious URL Classification

```text
URL
 |
 v
Feature Extraction
 |
 v
ML Model
 |
 v
Safe / Suspicious
```

Potential models:

```text
Logistic Regression
Random Forest
XGBoost
Neural Network
```

### Intelligent Analytics

Predict:

```text
Expected clicks
Traffic spikes
Suspicious behavior
Popular links
```

These should remain future extensions rather than forcing AI into the core architecture.

---

## 39. Future Improvements

```text
URL Shortener
      |
      +-- Custom aliases
      +-- QR codes
      +-- Expiring URLs
      +-- User accounts
      +-- Click analytics
      +-- Geographic analytics
      +-- Kafka event pipeline
      +-- Distributed ID generation
      +-- Database read replicas
      +-- Redis Cluster
      +-- CDN
      +-- Kubernetes
      +-- Multi-region deployment
```

---

## 40. System Design Concepts Covered

```text
                URL SHORTENER
                     |
       +-------------+-------------+
       |             |             |
       v             v             v
   Database        Cache       Algorithms
       |             |             |
       v             v             v
   Indexing        Redis         Base62
       |             |
       v             v
   Scalability   Rate Limiting
       |             |
       +------+------+
              |
              v
       Distributed Systems
              |
              v
        Load Balancing
              |
              v
        Observability
              |
              v
         Performance
```

---

## 41. What Makes This Project Portfolio-Worthy?

The value isn't:

> "I created a Bitly clone."

The value is being able to explain:

> "I designed a stateless URL-shortening service backed by PostgreSQL and Redis. PostgreSQL acts as the source of truth, while Redis uses a cache-aside strategy to reduce repeated database lookups. Short codes are generated using Base62 encoding of unique IDs. I added Redis-based rate limiting, database indexing, automated tests, Dockerized infrastructure, and load testing to evaluate throughput and P95/P99 latency."

This demonstrates understanding of:

- Backend engineering
- Database design
- Caching
- Algorithms
- Distributed systems
- Performance
- Production engineering

---

## 42. Final Target Architecture

```text
                         CLIENT
                           |
                           v
                    +-------------+
                    | Load        |
                    | Balancer    |
                    +------+------+
                           |
              +------------+------------+
              |                         |
              v                         v
        +------------+            +------------+
        | API        |            | API        |
        | Instance 1 |            | Instance 2 |
        +-----+------+            +------+-----+
              |                          |
              +------------+-------------+
                           |
              +------------+------------+
              |                         |
              v                         v
         +---------+              +------------+
         |  Redis  |              | PostgreSQL |
         |         |              |            |
         | Cache   |              | Source     |
         | Rate    |              | of Truth   |
         | Limit   |              |            |
         +---------+              +-----+------+
                                        |
                                        v
                                    BACKUPS
```

---

## 43. Build Philosophy

Do not start by implementing the entire production architecture.

Build the system incrementally.

For every component, answer:

> **Why are we using this?**

Then ask:

> **What problem does it solve?**

Then:

> **What happens if we remove it?**

And finally:

> **What are the alternatives and trade-offs?**

Examples:

- Why PostgreSQL instead of MongoDB?
- Why Redis instead of PostgreSQL-only?
- Why Base62 instead of SHA-256?
- Why Cache-Aside?
- Why 302 instead of 301?
- Why stateless API servers?
- Why an index?
- Why Redis for rate limiting?
- Why a modular monolith instead of microservices?

The goal is to understand the architecture, not memorize it.

---

## 44. Project Success Criteria

The project is considered complete when it can:

- Create unique short URLs
- Redirect reliably
- Persist mappings in PostgreSQL
- Use Redis for caching
- Handle cache misses
- Handle expired URLs
- Prevent abusive request patterns
- Support authenticated users
- Track basic analytics
- Pass unit and integration tests
- Run through Docker Compose
- Run CI checks automatically
- Survive Redis failure gracefully
- Demonstrate measurable cache performance improvements
- Handle concurrent traffic through load testing
- Run multiple stateless API instances

---

## 45. Final Objective

By the end of this project, the objective is not merely to have a URL shortener.

The objective is to understand how a small backend application evolves into a production-oriented distributed system.

```text
Simple API
    |
    v
Database
    |
    v
Indexing
    |
    v
Caching
    |
    v
Rate Limiting
    |
    v
Authentication
    |
    v
Analytics
    |
    v
Testing
    |
    v
Docker
    |
    v
Load Testing
    |
    v
Horizontal Scaling
    |
    v
Production System
```

The final system should be something you can both **run** and **defend in a system-design interview**.
