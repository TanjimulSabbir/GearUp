<div align="center">

# Mini Social Media App — Backend

**A production-grade REST API for a social feed platform**, built with Node.js, TypeScript, Express 5, Prisma 7, and PostgreSQL — featuring JWT authentication, role-based access control, real-time push notifications, and a fully layered service architecture.

[![Node.js](https://img.shields.io/badge/Node.js-20%2B-339933?logo=node.js&logoColor=white)](https://nodejs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-Strict-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![Express](https://img.shields.io/badge/Express-5.x-000000?logo=express&logoColor=white)](https://expressjs.com)
[![Prisma](https://img.shields.io/badge/Prisma-7.x-2D3748?logo=prisma&logoColor=white)](https://www.prisma.io)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-Database-4169E1?logo=postgresql&logoColor=white)](https://www.postgresql.org)
[![License](https://img.shields.io/badge/License-ISC-blue.svg)](#license)

</div>

---

## Table of Contents

- [Overview](#overview)
- [Key Features](#key-features)
- [Tech Stack](#tech-stack)
- [Architecture](#architecture)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
- [Environment Variables](#environment-variables)
- [Database Schema](#database-schema)
- [API Reference](#api-reference)
- [Authentication & Authorization](#authentication--authorization)
- [Validation](#validation)
- [Standardized Response Contracts](#standardized-response-contracts)
- [Error Handling](#error-handling)
- [Push Notifications](#push-notifications)
- [Scripts](#scripts)
- [Deployment](#deployment)
- [Security Considerations](#security-considerations)
- [Roadmap](#roadmap)
- [Contributing](#contributing)
- [License](#license)

---

## Overview

This service powers the backend of a mini social media platform, exposing a versioned, JSON-first REST API for user accounts, posts, comments, likes, and notifications. It is designed around a **modular, domain-driven architecture** — each feature area (`auth`, `user`, `post`, `comment`, `like`, `notification`) is self-contained with its own routes, controllers, services, validation schemas, and interfaces, making the codebase easy to navigate, test, and extend.

The API is built to run equally well on a traditional long-running Node process or as a serverless deployment (Vercel), with careful handling of connection pooling, cold starts, and stateless request handling throughout.

## Key Features

| Category | Capabilities |
|---|---|
| **Authentication** | JWT access + refresh token flow, HTTP-only secure cookies, bcrypt password hashing |
| **Authorization** | Role-based access control (`USER`, `AUTHOR`, `ADMIN`), per-route role guards, blocked-account enforcement |
| **Content** | Full CRUD for posts, comments, and likes with ownership checks |
| **Discovery** | Pagination, full-text search, filtering, and sorting on the post feed |
| **Engagement** | Like/unlike toggling, threaded comments, real-time push notifications |
| **Notifications** | Firebase Cloud Messaging integration with persistent in-app notification records |
| **Reliability** | Centralized error handling, typed Prisma error translation, Zod-validated input on every mutating route |
| **Observability** | Structured, consistent success/error response envelopes across the entire API surface |

## Tech Stack

| Layer | Technology |
|---|---|
| Runtime | Node.js 20+ |
| Language | TypeScript (strict mode) |
| Web Framework | Express 5 |
| ORM | Prisma 7 |
| Database | PostgreSQL |
| Validation | Zod |
| Authentication | `jsonwebtoken`, `bcryptjs` |
| Push Notifications | Firebase Admin SDK (FCM) |
| Payments *(scaffolded)* | Stripe |
| Tooling | `tsup` (bundling), `tsx` (dev runtime), ESLint-ready structure |

## Architecture

The application follows a **layered, modular monolith** pattern:

```
Request → Router → Middleware (auth / validation) → Controller → Service → Prisma → PostgreSQL
                                                          ↓
                                                   Global Error Handler → Standardized JSON Response
```

**Design principles:**

- **Separation of concerns** — controllers only handle HTTP I/O; all business logic and data access lives in the service layer.
- **Fail-safe by default** — every async handler is wrapped in `catchAsync`, so uncaught errors are always routed to the centralized error handler rather than crashing the process.
- **Defense in depth on auth** — role checks are evaluated against the freshest database record on every request, not a cached JWT claim, preventing stale-privilege exploits after a role change or account block.
- **Non-blocking side effects** — push notifications are dispatched fire-and-forget, so a downstream notification failure (e.g. an expired FCM token) never fails the primary user action (liking or commenting).

## Project Structure

```
.
├── package.json
├── tsconfig.json
├── tsup.config.ts
├── vercel.json
├── prisma/
│   ├── migrations/
│   └── schema/
│       ├── schema.prisma
│       ├── enums.prisma
│       ├── user.prisma
│       ├── profile.prisma
│       ├── post.prisma
│       ├── comment.prisma
│       ├── like.prisma
│       └── notification.prisma
├── generated/prisma/          # Prisma Client output (git-ignored)
├── public/
│   └── index.html             # API status / landing page
└── src/
    ├── app.ts                 # Express app assembly (middleware, routes)
    ├── server.ts              # Process entrypoint (local dev + serverless export)
    ├── config/
    │   └── index.ts           # Centralized environment configuration
    ├── lib/
    │   └── prisma.ts          # Prisma Client singleton
    ├── middlewares/
    │   ├── auth.ts            # JWT verification + RBAC guard
    │   ├── globalErrorHandler.ts
    │   └── notFound.ts
    ├── modules/
    │   ├── auth/
    │   ├── user/
    │   ├── post/
    │   ├── comment/
    │   ├── like/
    │   └── notification/
    │       ├── *.route.ts
    │       ├── *.controller.ts
    │       ├── *.service.ts
    │       ├── *.validation.ts
    │       └── *.interface.ts
    └── utils/
        ├── catchAsync.ts
        ├── jwt.ts
        ├── sendResponse.ts
        └── errors/
            ├── app.error.ts
            ├── handle.prisma.error.ts
            └── zod.error.ts
```

## Getting Started

### Prerequisites

- Node.js **20+**
- A PostgreSQL database (local, Docker, or hosted — e.g. Neon, Supabase, RDS)
- A Firebase project with a service account (for push notifications)

### Installation

```bash
git clone https://github.com/TanjimulSabbir/Mini-Social-Media-App-Backend.git
cd Mini-Social-Media-App-Backend
npm install
```

`npm install` automatically triggers `postinstall` → `prisma generate`, producing the typed Prisma Client into `generated/prisma`.

### Environment Setup

Copy the example file and populate it with your own values:

```bash
cp .env.example .env
```

See [Environment Variables](#environment-variables) below for the full list.

### Database Setup

```bash
npx prisma migrate dev
```

This applies all pending migrations and keeps your local schema in sync with `prisma/schema/`.

### Run the Development Server

```bash
npm run dev
```

The API will be available at `http://localhost:<PORT>/api`, with a live status page at `http://localhost:<PORT>/`.

### Production Build

```bash
npm run build
npm start
```

## Environment Variables

| Variable | Description | Example |
|---|---|---|
| `NODE_ENV` | Runtime environment | `development` \| `production` |
| `PORT` | HTTP server port | `7000` |
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://user:pass@host:5432/db` |
| `CLIENT_ORIGINS` | Comma-separated list of allowed CORS origins | `https://app.example.com,http://localhost:3000` |
| `BCRYPT_SALT_ROUNDS` | Password hashing cost factor | `12` |
| `JWT_ACCESS_SECRET` | Signing secret for access tokens | — |
| `JWT_REFRESH_SECRET` | Signing secret for refresh tokens | — |
| `JWT_ACCESS_EXPIRES_IN` | Access token lifetime | `15m` |
| `JWT_REFRESH_EXPIRES_IN` | Refresh token lifetime | `7d` |
| `FIREBASE_PROJECT_ID` | Firebase project identifier | — |
| `FIREBASE_CLIENT_EMAIL` | Firebase service account email | — |
| `FIREBASE_PRIVATE_KEY` | Firebase service account private key (`\n`-escaped) | — |

> **Security note:** Never commit `.env` to version control. Secrets should be injected via your hosting provider's environment variable manager (Vercel, Railway, Docker secrets, etc.) in production.

## Database Schema

The schema is split across multiple `.prisma` files under `prisma/schema/` for maintainability, unified by a single `schema.prisma` generator/datasource definition.

### Core Models

| Model | Purpose | Key Fields |
|---|---|---|
| **User** | Account identity and access control | `id`, `name`, `email`, `password`, `role`, `activeStatus`, `fcmToken` |
| **Profile** | Extended user metadata (1:1 with User) | `profilePhoto`, `bio` |
| **Post** | Core content unit | `title`, `content`, `thumbnail`, `isFeatured`, `status`, `tags[]` |
| **Comment** | Threaded engagement on posts | `content`, `authorId`, `postId`, `status` |
| **Like** | Post engagement (unique per user/post) | `userId`, `postId` (composite unique) |
| **Notification** | In-app + push notification record | `recipientId`, `actorId`, `type`, `isRead` |

### Enumerations

- `Role`: `USER` · `AUTHOR` · `ADMIN`
- `ActiveStatus`: `ACTIVE` · `BLOCKED`
- `CommentStatus`: `APPROVED` · `REJECT`
- `NotificationType`: `LIKE` · `COMMENT` · `FOLLOW` · `MENTION`

### Relational Integrity

All foreign-key relations cascade on delete where appropriate (e.g. deleting a `User` cascades to their `Comment` records), and indexes are defined on high-traffic lookup columns (`postId`, `authorId`) to keep query performance predictable as data volume grows.

## API Reference

All endpoints are mounted under the `/api` base path. Protected routes require a valid access token (via HTTP-only cookie or `Authorization: Bearer <token>` header) and, where noted, a specific role.

### Auth

| Method | Endpoint | Description | Access |
|---|---|---|---|
| `POST` | `/api/auth/signup` | Register a new user | Public |
| `POST` | `/api/auth/login` | Authenticate and issue token cookies | Public |
| `POST` | `/api/auth/refresh-token` | Rotate access token via refresh cookie | Public (cookie-gated) |

### Users

| Method | Endpoint | Description | Access |
|---|---|---|---|
| `POST` | `/api/users/register` | Register a user with optional profile photo | Public |
| `PATCH` | `/api/users/device/update-fcm-token` | Update device push token | USER · AUTHOR · ADMIN |

### Posts

| Method | Endpoint | Description | Access |
|---|---|---|---|
| `POST` | `/api/posts` | Create a post | USER · AUTHOR · ADMIN |
| `GET` | `/api/posts` | List posts (paginated, filterable, searchable) | Authenticated |
| `GET` | `/api/posts/stats` | Aggregate post statistics | ADMIN |
| `GET` | `/api/posts/my-posts` | List the authenticated user's posts | Authenticated |
| `GET` | `/api/posts/:postId` | Retrieve a single post with author + counts | Public |
| `PATCH` | `/api/posts/:postId` | Update a post (owner-enforced) | USER · AUTHOR · ADMIN |
| `DELETE` | `/api/posts/:postId` | Delete a post (owner-enforced) | USER · AUTHOR · ADMIN |

**`GET /api/posts` query parameters:** `page`, `limit`, `searchTerm`, `title`, `content`, `authorId`, `tags`, `status`, `sortBy`, `sortOrder`

### Comments

| Method | Endpoint | Description | Access |
|---|---|---|---|
| `POST` | `/api/comments` | Create a comment on a post | USER · AUTHOR · ADMIN |
| `GET` | `/api/comments/:postId` | List comments for a post | Authenticated |
| `DELETE` | `/api/comments/:commentId` | Delete a comment (owner-enforced) | USER · AUTHOR · ADMIN |

### Likes

| Method | Endpoint | Description | Access |
|---|---|---|---|
| `POST` | `/api/likes` | Toggle like/unlike on a post | USER · AUTHOR · ADMIN |

### Notifications

| Method | Endpoint | Description | Access |
|---|---|---|---|
| `GET` | `/api/notifications` | List notifications (paginated) | Authenticated |
| `PATCH` | `/api/notifications/:notificationId/read` | Mark one notification as read | Authenticated |
| `PATCH` | `/api/notifications/read-all` | Mark all notifications as read | Authenticated |

> A full request/response Postman collection is available in [`/docs/postman_collection.json`](#) *(add your exported collection here)*.

## Authentication & Authorization

**Token flow:**

1. `POST /api/auth/login` verifies credentials and issues two signed JWTs: a short-lived **access token** and a longer-lived **refresh token**, both set as `httpOnly` cookies (and returned in the body for non-browser clients).
2. Protected routes pass through the `auth(...roles)` middleware, which:
   - Extracts the token from the `accessToken` cookie or `Authorization: Bearer` header
   - Verifies the JWT signature and expiry
   - Re-fetches the user record **from the database** (not the token payload) to confirm current role and account status
   - Rejects the request if the account is blocked or lacks a required role
   - Attaches a trusted `req.user` object for downstream handlers
3. `POST /api/auth/refresh-token` exchanges a valid refresh token for a new access token without requiring re-authentication.

This "verify against the source of truth" pattern ensures that a role change, account suspension, or permission downgrade takes effect **immediately** — not only after the current access token expires.

## Validation

Every mutating endpoint validates its input through **Zod schemas** before it reaches business logic, via a shared `validate(schema, target)` middleware. Invalid input is rejected early with a structured `400` response listing every failing field — never silently coerced or ignored.

Validation coverage includes: required-field enforcement, string length bounds, URL format checks, enum membership, and numeric bounds on pagination parameters.

## Standardized Response Contracts

**Success:**

```json
{
  "success": true,
  "statusCode": 200,
  "message": "Post retrieved successfully",
  "data": { "...": "..." },
  "meta": { "page": 1, "limit": 10, "total": 42 }
}
```

**Error:**

```json
{
  "success": false,
  "statusCode": 404,
  "name": "AppError",
  "message": "Post not found",
  "errorInfo": { "postId": "..." }
}
```

Every response — success or failure, from any route — conforms to one of these two shapes, giving frontend and mobile clients a single, predictable contract to build against.

## Error Handling

The API implements defense-in-depth error handling across four layers:

| Layer | Responsibility |
|---|---|
| `AppError` | Typed application errors carrying an explicit HTTP status, message, and structured `errorInfo` |
| `catchAsync` | Wraps every async controller so thrown/rejected errors are automatically forwarded to Express's error pipeline |
| `globalErrorHandler` | Normalizes **all** error types — `AppError`, `ZodError`, and every `PrismaClientKnownRequestError` / `ValidationError` / `InitializationError` variant — into the standard error envelope |
| `notFound` | Catches unmatched routes and produces a structured 404, consistent with every other error response |

Prisma errors are translated into actionable messages rather than leaking raw database internals (e.g. a `P2002` unique constraint violation becomes `"Duplicate key error"` with the offending field named in `errorInfo`, not a raw SQL exception).

## Push Notifications

The notification system combines **persistent, queryable records** with **real-time delivery**:

1. When a `LIKE` or `COMMENT` event occurs, `notificationService.sendPostNotification` is invoked asynchronously (fire-and-forget) so the triggering action's response is never delayed or blocked by notification delivery.
2. A `Notification` row is written to PostgreSQL, giving the recipient a durable, in-app notification history independent of push delivery success.
3. If the recipient has a registered `fcmToken`, a push notification is dispatched via the Firebase Admin SDK (modular `getMessaging()` API).
4. Delivery failures (expired tokens, offline devices) are caught and logged without propagating back to the originating request — a stale push token can never break a like or comment action.

Self-notifications (a user liking/commenting on their own post) are suppressed by design.

## Scripts

| Script | Command | Purpose |
|---|---|---|
| `dev` | `tsx watch src/server.ts` | Hot-reloading local development server |
| `build` | `tsup` | Bundle TypeScript into production-ready output in `dist/` |
| `start` | `node dist/server.js` | Run the compiled production server |
| `postinstall` | `prisma generate` | Auto-regenerate the Prisma Client after every install |

## Deployment

This project is deploy-ready for both traditional Node hosting and serverless platforms.

**Vercel (serverless):**

```bash
npm run build
vercel deploy --prod
```

`vercel.json` routes all incoming traffic to the compiled server entrypoint, which conditionally skips `app.listen()` when running under Vercel's `VERCEL` environment flag — exporting the Express app as a request handler instead. Prisma's connection is managed through a global singleton to avoid connection exhaustion across serverless cold starts.

**Traditional hosting (Docker / VM / Railway / Render):**

```bash
npm run build
npm start
```

Ensure all [environment variables](#environment-variables) are configured on the host, and that `prisma migrate deploy` has been run against the target database before the first boot.

## Security Considerations

- Passwords are hashed with `bcryptjs` using a configurable salt round count — never stored or logged in plaintext.
- JWTs are short-lived for access tokens and rotated via a separate refresh token, limiting the blast radius of a leaked access token.
- Tokens are delivered as `httpOnly` cookies by default, mitigating XSS-based token theft.
- Role and account-status checks are evaluated against live database state on every authenticated request.
- Generic, non-enumerable authentication error messages (`"Invalid email or password"`) are used to prevent user-enumeration attacks.
- Stack traces are only included in error responses when `NODE_ENV=development`.

**Recommended before production launch:**
- Rate limiting on `auth` routes (e.g. `express-rate-limit`) to mitigate brute-force login attempts
- Request body size limits and stricter CORS origin allow-listing
- Structured logging (e.g. `pino`) with correlation IDs for request tracing
- Automated dependency vulnerability scanning (`npm audit`, Dependabot, or Snyk)

## Roadmap

- [ ] Integration and unit test coverage (Jest / Vitest + Supertest)
- [ ] OpenAPI / Swagger specification for interactive API docs
- [ ] Rate limiting and request throttling middleware
- [ ] Structured application logging and observability (request IDs, latency metrics)
- [ ] Refresh token rotation with revocation list / denylist
- [ ] Stripe-backed premium content tier (dependency already present)
- [ ] Follow/unfollow social graph, backing the existing `FOLLOW` notification type
- [ ] Comment moderation workflow (`APPROVED` / `REJECT` states are modeled but not yet surfaced via an admin endpoint)

## Contributing

Contributions, issues, and feature requests are welcome. Please open an issue first to discuss significant changes before submitting a pull request.

1. Fork the repository
2. Create a feature branch (`git checkout -b feat/your-feature`)
3. Commit your changes with clear, descriptive messages
4. Open a pull request against `main`

## License

Distributed under the **ISC License**. See the repository's `LICENSE` file for full terms.

---

<div align="center">

Built by **Tanjimul Islam Sabbir**

</div>