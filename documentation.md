# GearUp API — Documentation

Sports & outdoor gear rental platform. Express + TypeScript + Prisma (PostgreSQL) + Stripe.

- **Base URL**: `{{baseUrl}}` → e.g. `http://localhost:7000/api/v1` locally
- **Auth**: JWT access + refresh tokens, set as `httpOnly` cookies on login (also echoed in the
  response body — see [Known Issues](#known-issues))
- **Roles**: `CUSTOMER`, `PROVIDER`, `ADMIN`
- **Response envelope (success)**:
  ```json
  { "success": true, "statusCode": 200, "message": "...", "data": {}, "meta": {} }
  ```
- **Response envelope (error)**:
  ```json
  { "success": false, "statusCode": 404, "message": "..." }
  ```

---

## 1. Setup

1. `npm install`
2. Create a `.env` (see keys below — **never commit real values, and rotate any secret that has
   ever been shared outside your own machine**):

   | Key | Purpose |
   |---|---|
   | `NODE_ENV` | `development` \| `production` — controls cookie `secure`/`sameSite` flags |
   | `PORT` | Server port |
   | `DATABASE_URL` | PostgreSQL connection string (Prisma) |
   | `CLIENT_ORIGINS` | Comma-separated list of allowed CORS origins |
   | `BCRYPT_SALT_ROUNDS` | Password hashing cost factor |
   | `JWT_ACCESS_SECRET` / `JWT_REFRESH_SECRET` | JWT signing secrets |
   | `JWT_ACCESS_EXPIRES_IN` / `JWT_REFRESH_EXPIRES_IN` | e.g. `1d`, `7d` |
   | `FIREBASE_PROJECT_ID` / `FIREBASE_CLIENT_EMAIL` / `FIREBASE_PRIVATE_KEY` | Firebase admin SDK (usage not visible in the reviewed modules) |
   | `STRIPE_PRODUCT_ID` | Default Stripe price id (declared, not currently referenced in `payment.service.ts`) |
   | `STRIPE_SECRECTE_KEY` *(sic)* | Stripe secret key — note the existing typo in the variable name; keep it consistent or fix it everywhere at once |
   | `STRIPE_WEBHOOK_SECRET` | Used to verify `stripe-signature` on the webhook route |
   | `FRONTEND_URL` | Used for Stripe Checkout `success_url` / `cancel_url` |

3. `npx prisma generate && npx prisma migrate deploy`
4. `npm run dev` (or your start script)

Import `GearUp_API_Full.postman_collection.json` into Postman, plus one of the two environment
files, and enable Postman's cookie jar (Settings → General) so a single login carries your
session across every other request.

---

## 2. Auth model

- `POST /auth/login` and `POST /auth/refresh-token` set `accessToken` / `refreshToken` as
  `httpOnly` cookies — this is what actually authenticates subsequent requests.
- Both endpoints also return the tokens in the JSON body. Keep this in mind if you're building a
  browser client: reading them into JS defeats the XSS protection the `httpOnly` flag is there
  for (see [Known Issues](#known-issues)).
- `auth("ROLE1", "ROLE2", ...)` middleware gates a route to one or more roles; unauthenticated or
  wrong-role requests fail before the controller runs.
- There is no logout endpoint in the reviewed routes — logging out means clearing cookies
  client-side (or you can add a route that does `res.clearCookie(...)`).

---

## 3. Data model (Prisma)

| Model | Notes |
|---|---|
| **User** | `role`: CUSTOMER / PROVIDER / ADMIN. `accountStatus`: ACTIVE / INACTIVE / BANNED. Has one optional `Profile`. |
| **Profile** | 1:1 with User — photo + bio. No route currently reads or writes this model. |
| **Category** | Unique `name` and `slug`. |
| **GearItem** | Belongs to a `Category` and a provider `User`. `condition`: NEW/GOOD/FAIR/DAMAGED. `isAvailable` used for soft-delete. |
| **RentalOrder** | Belongs to a customer. `status` state machine below. Holds `rentalItems` and `payments`. |
| **RentalItem** | Line item — snapshotted `pricePerDay` and `days` at order time (price changes to the gear afterward don't retroactively affect existing orders). |
| **Payment** | One or more per order (retries produce new PENDING rows via `existingPending` reuse logic). `method`: STRIPE / SSLCOMMERZ (only STRIPE is implemented). |
| **Review** | Unique per `(userId, gearItemId, rentalOrderId)` — one review per item per order. |

### RentalOrder status machine

```
PLACED ──confirm──▶ CONFIRMED ──pay (webhook)──▶ PAID ──pick up──▶ PICKED_UP ──return──▶ RETURNED
  │                     │                          │
  └──cancel──▶ CANCELLED ◀──cancel──────────────────┘
                         │
                         └──payment fails/expires──▶ PAYMENT_FAILED ──pay again──▶ PAID
```

- Only the **provider** can move `PLACED → CONFIRMED` and `CONFIRMED/PAID/PICKED_UP → next`
  (via `PATCH /provider/orders/:id`), constrained by `ALLOWED_TRANSITIONS` in
  `provider.service.ts`.
- Only the **customer** can cancel (`PLACED`/`CONFIRMED` only) or request a return
  (`PICKED_UP` + fully paid only).
- `PAID` is reached only via the Stripe webhook (`checkout.session.completed`), never directly by
  a provider action.
- An order stuck at `CONFIRMED`/`PAYMENT_FAILED` for more than 24 hours is auto-cancelled and its
  stock released, the next time someone tries to pay for it (`createCheckoutSession`) — there's
  no background job for this, it's lazy/on-access only.

---

## 4. Endpoint reference

Legend: 🔓 public · 🔑 authenticated (any role) · role names = restricted to that role.

### Auth
| Method | Path | Access | Body |
|---|---|---|---|
| POST | `/auth/login` | 🔓 | `{ email, password }` |
| POST | `/auth/refresh-token` | 🔓 (reads `refreshToken` cookie) | — |

### Users
| Method | Path | Access | Body |
|---|---|---|---|
| POST | `/users/signup` | 🔓 | `{ name, email, password, phone?, address?, role: CUSTOMER\|PROVIDER }` |

### Categories
| Method | Path | Access | Notes |
|---|---|---|---|
| GET | `/categories` | 🔓 | `?page&limit&sortBy&sortOrder` |
| POST | `/admin/categories` | ADMIN | single object or array of objects |
| PUT | `/admin/categories/:id` | ADMIN | partial update |
| DELETE | `/admin/categories/:id` | ADMIN | 400 if gear items still reference it |

### Gear
| Method | Path | Access | Notes |
|---|---|---|---|
| GET | `/gear` | 🔓 | filters: `search, categoryId, brand, condition, minPrice, maxPrice, isAvailable`; defaults to available-only |
| GET | `/gear/:id` | 🔓 | |
| POST | `/provider/gear` | PROVIDER | body is an **array** of gear items |
| GET | `/provider/gear` | PROVIDER | own listings |
| PUT | `/provider/gear/:id` | PROVIDER | must own the item |
| DELETE | `/provider/gear/:id` | PROVIDER | soft-deletes (`isAvailable: false`) if active orders reference it, else hard-deletes |
| GET | `/admin/gear` | ADMIN | all listings, paginated |

### Rentals
| Method | Path | Access | Notes |
|---|---|---|---|
| POST | `/rentals` | CUSTOMER | `{ startDate, endDate, items: [{ gearItemId, quantity }] }`; decrements stock atomically per item |
| GET | `/rentals` | CUSTOMER | own orders |
| GET | `/rentals/:id` | CUSTOMER/PROVIDER/ADMIN | visible to the owning customer, an admin, or a provider with gear in the order |
| PATCH | `/rentals/:id/cancel` | CUSTOMER | only from `PLACED`/`CONFIRMED`; releases stock |
| PATCH | `/rentals/:id/request-return` | CUSTOMER | only from `PICKED_UP` + fully paid |
| GET | `/admin/rentals` | ADMIN | all orders, paginated |
| GET | `/provider/orders` | PROVIDER | orders containing the provider's gear |
| PATCH | `/provider/orders/:id` | PROVIDER | `{ status }`, constrained by the transition map above |

### Payments
| Method | Path | Access | Notes |
|---|---|---|---|
| POST | `/payment/create` | CUSTOMER | creates/returns a Stripe Checkout session for a `CONFIRMED`/`PAYMENT_FAILED` order |
| POST | `/payment/confirm` | CUSTOMER | client-side callback after redirect back from Stripe; `{ sessionId }` in body or `?session_id=` query |
| POST | `/payment/webhook` | Stripe only (raw body + signature) | `checkout.session.completed` / `async_payment_failed` / `expired` |
| GET | `/payment` | CUSTOMER | own payments |
| GET | `/payment/:id` | CUSTOMER/ADMIN | |

> Mount path is `/api/v1/payment` (singular) in `app.ts` — see [Known Issues](#known-issues).

### Reviews
| Method | Path | Access | Notes |
|---|---|---|---|
| POST | `/reviews` | CUSTOMER | only after the specific gear item's order reached `RETURNED`; one review per (user, gear, order) |

### Admin — users
| Method | Path | Access | Notes |
|---|---|---|---|
| GET | `/admin/users` | ADMIN | |
| PATCH | `/admin/users/:id` | ADMIN | `{ accountStatus }`; cannot target another ADMIN |

---

## 5. Known Issues

Ordered roughly by severity.

1. **Secrets exposure (operational, not code).** The `.env` shared alongside this codebase
   contains a live-looking Postgres URL, Stripe secret key, Stripe webhook secret, Firebase
   private key, and JWT secrets. Rotate all of these regardless of git history, since they've now
   left your machine via this conversation.

2. **Postman collection pointed at the wrong payment path (fixed in the attached revision).**
   Every request under **Payments** used `/payments/*`, but `app.ts` mounts the router at
   `/api/v1/payment` (singular). All four requests — create, confirm, get mine, get by id — would
   have 404'd against the real server.

3. **Login returns tokens in the response body in addition to `httpOnly` cookies.** This
   partially defeats the purpose of `httpOnly` (XSS mitigation) — a client that reads
   `data.accessToken` and stores it in `localStorage`/JS state reintroduces exactly the exposure
   the cookie approach exists to prevent. Either drop the tokens from the body, or make it
   explicit in your client guidance that only the cookies should be relied on.

4. **User-enumeration + inconsistent error codes on login.** `auth.controller.ts` pre-checks for
   the user and throws `404 "User not found"` before delegating to `auth.service.ts`, which throws
   `400 "Invalid email or password"` for a bad password. An attacker can distinguish "no such
   account" from "wrong password" by status code/message. If that's not an accepted trade-off,
   return the same generic message and status for both cases, and drop the redundant lookup in the
   controller (the service already re-fetches the user).

5. **Possible stock race condition under concurrency.** `rentalService.create` reads
   `gear.stock`, checks it against the requested quantity, and only *then* issues a
   `decrement` — inside a transaction, but without a `WHERE stock >= quantity` guard on the update
   itself. Two concurrent requests for the last unit of the same item can both pass the check
   before either decrements, driving stock negative. Prisma supports conditional updates
   (`updateMany` with a `stock: { gte: quantity }` filter, checking the returned `count`) — worth
   switching to that pattern for the decrement step.

6. **`INACTIVE` accounts can still log in.** `AccountStatus` has `ACTIVE` / `INACTIVE` / `BANNED`,
   but `auth.service.ts` only blocks `BANNED`. If `INACTIVE` is meant to represent a suspended
   or unverified account, it currently has no effect on login.

7. **`Profile` model is unused.** It's defined in Prisma and linked 1:1 to `User`, but no
   controller, service, or route reads or writes it — dead schema, or a missing feature (avatar/
   bio management), depending on intent.

8. **Bulk gear-item creation doesn't return created rows.** `providerServices.createGearItems`
   uses `prisma.gearItem.createMany`, which only returns `{ count }`. There's no way to get the
   new items' ids straight from that response — callers have to immediately call `GET
   /provider/gear` to find them. Switching to `Promise.all` of individual `create()` calls (or
   Prisma's `createManyAndReturn` if your Prisma version supports it) would fix this and also let
   you validate/return per-item errors instead of an all-or-nothing count.

9. **No logout route.** Nothing clears the auth cookies server-side; "logging out" is purely a
   client convention (clear cookies / stop sending them).

10. **Category `createMany` bypasses the uniqueness check `createOne` has.** `createOne` checks
    for an existing category by name/slug before inserting; `createMany` relies only on
    `skipDuplicates`, which is a DB-level exact-match check — case variants (`"Tents"` vs
    `"tents"`) aren't caught by either path since the unique constraints aren't case-insensitive.

11. **No production hardening middleware visible in `app.ts`.** No `helmet`, no rate limiting, no
    request logging (e.g. `morgan`/`pino-http`), no compression. Not necessarily missing (could
    live in files not reviewed here), but worth confirming before shipping.

12. **`.env` has `NODE_ENV=production` while pointing at `localhost` origins.** In production
    mode the login/refresh cookies are set with `secure: true` and `sameSite: "none"`, which
    requires HTTPS — testing locally over plain `http://localhost` with `NODE_ENV=production` set
    will cause the browser to silently refuse to store those cookies. Use `NODE_ENV=development`
    for local work.

13. **`refreshTokenSchema` is defined but never wired up.** `auth.validation.ts` exports it, but
    `auth.routes.ts`'s `/refresh-token` route has no `validate(...)` — harmless today since the
    token is read from a cookie, not the body, but it's dead code that suggests the route once
    took a body param and no longer does (or never got hooked up).

---

## 6. Postman collection changes in this delivery

- Fixed the `/payments` → `/payment` path bug across all 4 payment requests.
- Added `pm.test()` assertions (status code + envelope shape) to every request.
- Added automatic variable capture: creating or listing a category/gear item/rental
  order/payment/user now populates `{{categoryId}}`, `{{gearId}}`, `{{orderId}}`,
  `{{paymentId}}`, `{{userId}}` for you, so folders can be run top-to-bottom via Collection
  Runner without manual copy-pasting.
- Corrected the Login request's documented error codes (was `401`, actually `400` for bad
  password) and flagged the enumeration issue directly in its description.
- Added a note on the Stripe Webhook request explaining it can't be triggered validly from
  Postman — use the Stripe CLI instead.
- Added `Local` and `Production` environment files (`baseUrl` + all shared variables,
  no secrets).