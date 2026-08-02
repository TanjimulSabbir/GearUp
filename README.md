# GearUp 🏋️

**Rent Sports & Outdoor Gear Instantly**

GearUp is a backend REST API for a sports and outdoor equipment rental platform. Customers browse gear, place rental orders, pay online, and leave reviews. Providers manage their own inventory and fulfill orders. Admins oversee users, listings, and platform-wide operations.

---

## Table of Contents

- [Tech Stack](#tech-stack)
- [Architecture](#architecture)
- [Project Structure](#project-structure)
- [Roles & Permissions](#roles--permissions)
- [Getting Started](#getting-started)
- [Environment Variables](#environment-variables)
- [Database Schema](#database-schema)
- [API Reference](#api-reference)
- [Rental Order Lifecycle](#rental-order-lifecycle)
- [Error Handling](#error-handling)
- [Authentication](#authentication)
- [Validation](#validation)
- [Scripts](#scripts)
- [Deployment](#deployment)
- [Contributing](#contributing)

---

## Tech Stack

| Layer | Technology |
|---|---|
| Runtime | Node.js |
| Language | TypeScript |
| Framework | Express.js |
| ORM | Prisma |
| Database | PostgreSQL |
| Validation | Zod |
| Auth | JWT (access + refresh tokens via httpOnly cookies) |
| Payments | Stripe, SSLCommerz |
| Package manager | npm |
| Deployment | Vercel |

---

## Architecture

The API follows a modular, layered structure inspired by clean architecture principles — each feature is self-contained with its own routes, controller, service, and validation layer.

```
Request → Router → Zod Validation Middleware → Controller → Service → Prisma → Database
                                                     ↓
                                          sendResponse / AppError
                                                     ↓
                                          Global Error Handler
```

- **Routes** define endpoints and attach auth/validation middleware.
- **Controllers** are thin — they extract the request, call the service, and format the response via `sendResponse`.
- **Services** contain all business logic and Prisma queries. This is the only layer allowed to touch the database.
- **Validation** schemas (Zod) run before the controller, guaranteeing the shape of `body`, `params`, and `query` by the time a request reaches business logic.
- **Errors** are thrown as `AppError` instances anywhere in the service layer and caught centrally by a global error-handling middleware — no manual try/catch needed in controllers, thanks to a `catchAsync` wrapper.

---

## Project Structure

```
src/
├── app.ts                     # Express app setup, route mounting, global middleware
├── server.ts                  # Server bootstrap
├── config/                    # Environment config
├── lib/
│   └── prisma.ts              # Prisma client singleton
├── middlewares/
│   ├── auth.ts                # JWT auth + role-based access guard
│   └── globalErrorHandler.ts  # Central error formatter
├── utils/
│   ├── catchAsync.ts          # Async error-forwarding wrapper
│   ├── sendResponse.ts        # Standardized success response shape
│   └── errors/
│       ├── app.error.ts       # Custom AppError class
│       └── zod.error.ts       # Zod validation middleware
├── modules/
│   ├── auth/                  # Login, token refresh
│   ├── user/                  # Registration
│   ├── admin/                 # User/gear/rental oversight, category management
│   ├── category/              # Public category listing
│   ├── gear/                  # Public gear browsing, search, filters
│   ├── provider/              # Provider gear CRUD, order management
│   ├── rental/                # Customer rental order lifecycle
│   ├── review/                # Post-rental reviews
│   └── payment/                # Stripe / SSLCommerz integration
└── generated/
    └── prisma/                # Prisma-generated client & types
prisma/
├── schema.prisma
└── migrations/
```

Each module follows the same internal convention:

```
<module>/
├── <module>.routes.ts
├── <module>.controller.ts
├── <module>.service.ts
└── <module>.validation.ts
```

---

## Roles & Permissions

| Role | Description | Key Permissions |
|---|---|---|
| `CUSTOMER` | Users renting gear | Browse gear, place orders, pay, track status, leave reviews, manage own profile |
| `PROVIDER` | Gear vendors | Manage own gear inventory, view incoming orders, update order status |
| `ADMIN` | Platform moderators | Manage all users, oversee all rentals/gear, manage categories |

Role is selected at registration and enforced on every protected route via the `auth(...allowedRoles)` middleware.

---

## Getting Started

### Prerequisites

- Node.js ≥ 18
- PostgreSQL database (local or hosted, e.g. Prisma Postgres / Neon / Supabase)
- npm

### Installation

```bash
git clone <repository-url>
cd gearup-backend
npm install
```

### Setup

1. Copy the environment template and fill in your values:
   ```bash
   cp .env.example .env
   ```
2. Run Prisma migrations and generate the client:
   ```bash
   npx prisma migrate dev
   npx prisma generate
   ```
3. (Optional) Seed the database:
   ```bash
   npm run seed
   ```
4. Start the dev server:
   ```bash
   npm run dev
   ```

The API will be available at `http://localhost:5000/api/v1`.

---

## Environment Variables

| Variable | Description |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string |
| `NODE_ENV` | `development` \| `production` |
| `PORT` | Server port (default `5000`) |
| `JWT_ACCESS_SECRET` | Secret for signing access tokens |
| `JWT_REFRESH_SECRET` | Secret for signing refresh tokens |
| `JWT_ACCESS_EXPIRES_IN` | e.g. `1d` |
| `JWT_REFRESH_EXPIRES_IN` | e.g. `7d` |
| `CORS_ORIGIN` | Comma-separated list of allowed origins |
| `STRIPE_SECRET_KEY` | Stripe API secret key |
| `STRIPE_WEBHOOK_SECRET` | Stripe webhook signing secret |
| `SSLCOMMERZ_STORE_ID` | SSLCommerz store ID |
| `SSLCOMMERZ_STORE_PASSWORD` | SSLCommerz store password |
| `SSLCOMMERZ_IS_LIVE` | `true` \| `false` |


---

## Database Schema

Designed with Prisma. Core models:

- **User** — account info, role (`CUSTOMER` / `PROVIDER` / `ADMIN`), `accountStatus` (`ACTIVE` / `INACTIVE` / `BANNED`), `isActive` flag
- **Category** — gear categories (name, slug, description)
- **GearItem** — listings (name, brand, rentalPrice, stock, condition, isAvailable), linked to a `provider` and `category`
- **RentalOrder** — customer orders (startDate, endDate, totalAmount, status), linked to `customer`, `rentalItems`, `payments`, `reviews`
- **RentalItem** — join table between `RentalOrder` and `GearItem` with quantity
- **Payment** — one-to-one with `RentalOrder` (transactionId, amount, method, status, paidAt)
- **Review** — one per (`user`, `gearItem`, `rentalOrder`) combination, enforced via a compound unique constraint

Run `npx prisma studio` to browse the schema and data visually.

---

## API Reference

Base URL: `/api/v1`

### Auth

| Method | Endpoint | Access | Description |
|---|---|---|---|
| POST | `/auth/login` | Public | Login, sets accessToken/refreshToken httpOnly cookies |
| POST | `/auth/refresh-token` | Public (cookie) | Issue a new access token from a valid refresh token |

### Users

| Method | Endpoint | Access | Description |
|---|---|---|---|
| POST | `/users/signup` | Public | Register as customer or provider |

### Gear (Public)

| Method | Endpoint | Access | Description |
|---|---|---|---|
| GET | `/gear` | Public | List gear with pagination, search, and filters (category, brand, price range, availability) |
| GET | `/gear/:id` | Public | Get gear details |

### Categories (Public)

| Method | Endpoint | Access | Description |
|---|---|---|---|
| GET | `/categories` | Public | List all gear categories |

### Rentals (Customer)

| Method | Endpoint | Access | Description |
|---|---|---|---|
| POST | `/rentals` | Customer | Create a rental order for one or more gear items |
| GET | `/rentals` | Customer | List the authenticated customer's orders |
| GET | `/rentals/:id` | Owner / Provider of item / Admin | Get a single order's details |
| PATCH | `/rentals/:id/cancel` | Customer (owner) | Cancel an order (only while `PLACED` or `CONFIRMED`) |

### Payments

| Method | Endpoint | Access | Description |
|---|---|---|---|
| POST | `/payments/create` | Customer | Create a Stripe/SSLCommerz payment session for an order |
| POST | `/payments/confirm` | Webhook / callback | Confirm and record payment status |
| GET | `/payments` | Customer | Payment history |
| GET | `/payments/:id` | Customer / Admin | Single payment details |

### Provider

| Method | Endpoint | Access | Description |
|---|---|---|---|
| POST | `/provider/gear` | Provider | Add a new gear listing |
| GET | `/provider/gear` | Provider | List own gear |
| PUT | `/provider/gear/:id` | Provider (owner) | Update a gear listing |
| DELETE | `/provider/gear/:id` | Provider (owner) | Remove (or soft-delete, if active rentals exist) |
| GET | `/provider/orders` | Provider | List incoming orders containing own gear |
| PATCH | `/provider/orders/:id` | Provider (owner of item) | Update order status along the allowed transition path |

### Reviews

| Method | Endpoint | Access | Description |
|---|---|---|---|
| POST | `/reviews` | Customer | Leave a review for gear from a `RETURNED` order |

### Admin

| Method | Endpoint | Access | Description |
|---|---|---|---|
| GET | `/admin/users` | Admin | List all users |
| PATCH | `/admin/users/:id` | Admin | Update a user's account status |
| GET | `/admin/gear` | Admin | List all gear listings |
| GET | `/admin/rentals` | Admin | List all rental orders |
| POST | `/admin/categories` | Admin | Create a category |
| PUT | `/admin/categories/:id` | Admin | Update a category |
| DELETE | `/admin/categories/:id` | Admin | Delete a category |

A ready-to-import Postman collection covering all endpoints with example payloads is available in `/docs/postman`.

---

## Rental Order Lifecycle

```
PLACED ──confirm(provider)──▶ CONFIRMED ──pay──▶ PAID ──pickup──▶ PICKED_UP ──return──▶ RETURNED
   │
   └──cancel(customer)──▶ CANCELLED
```

Status transitions are enforced server-side via an explicit allow-list — a provider cannot jump an order directly from `PLACED` to `PICKED_UP`, for example. Cancelling or returning an order automatically restocks the associated gear.

---

## Error Handling

Every error in the system is represented as an `AppError(statusCode, message)` thrown from the service layer. A single global error-handling middleware catches it (via `catchAsync` forwarding to `next(error)`) and returns a consistent shape:

```json
{
  "success": false,
  "statusCode": 404,
  "message": "Gear item not found."
}
```

Unhandled/unexpected errors (Prisma errors, programming errors) are also normalized to this shape rather than leaking stack traces or raw driver errors to the client.

Successful responses follow the same consistent envelope:

```json
{
  "success": true,
  "statusCode": 200,
  "message": "Gear items fetched successfully",
  "data": [ ... ],
  "meta": { "page": 1, "limit": 10, "total": 42, "totalPages": 5 }
}
```

---

## Authentication

- JWTs are issued on login as an **access token** (short-lived) and **refresh token** (long-lived), both set as `httpOnly`, `secure` (in production), `sameSite`-appropriate cookies — never exposed to client-side JavaScript.
- Protected routes use an `auth(...roles)` middleware that verifies the access token and checks the user's role against an allow-list per route.
- `POST /auth/refresh-token` issues a new access token using a valid refresh token cookie, without requiring the user to log in again.

---

## Validation

All request input (`body`, `params`, `query`) is validated with [Zod](https://zod.dev) before it reaches a controller. Schemas are colocated with each module (`<module>.validation.ts`) and applied via a shared `validate(schema)` middleware. Unknown fields are rejected (`.strict()`) on writes to prevent mass-assignment, and query params are coerced/defaulted (pagination, sorting) rather than trusted as raw strings.

---

## Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start the dev server with hot reload |
| `npm run build` | Compile TypeScript to `dist/` |
| `npm start` | Run the compiled production build |
| `npx prisma migrate dev` | Apply schema changes locally |
| `npx prisma generate` | Regenerate the Prisma Client |
| `npx prisma studio` | Open a visual database browser |

---

## Deployment

The API is deployed on **Vercel**, backed by a hosted PostgreSQL instance (Prisma Postgres). The `vercel-build` script runs `prisma generate` and `tsc` before deploy to ensure the client and compiled output are always in sync with the current schema.

Required production environment variables must be configured in the Vercel project settings — see [Environment Variables](#environment-variables).

---

## Contributing

1. Create a feature branch from `main`.
2. Follow the existing module structure (`routes` → `controller` → `service` → `validation`) for any new feature.
3. Add/update Zod validation for any new or changed endpoint.
4. Run `npx prisma format` after any schema change, and include the generated migration in your PR.
5. Open a pull request with a clear description of the change.

---

## License

This project is proprietary and intended for evaluation purposes as part of its submission guidelines.