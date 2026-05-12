Project Made by: Ameer Jalo, Youssef Rifai
# dvdVault — Cinema, Preserved

> A production-grade, full-stack e-commerce experience for the discerning collector — a noir-styled storefront, a stateful shopping cart, a personal wishlist, a full order-history flow, and an analytics-driven admin console for end-to-end catalog management.

dvdVault is a boutique DVD/Blu-ray archive built as a single deployable web application. It pairs a cinematic obsidian-and-rouge storefront with a role-gated admin dashboard, all served by a JWT-secured FastAPI backend. The project demonstrates clean architectural separation, defensive security defaults, atomic order processing, data-driven dashboards, and an automated end-to-end smoke suite that runs against any deployment target.

---

## Features

### Collector experience

- **Self-service registration** — `/register` page with email + confirm-password validation (client-side match check and 8-character minimum). On success a green confirmation banner appears and the user is redirected to `/login` after 1.5 seconds.
- **Storefront** — A hero-led landing page rendered in a noir theater palette (obsidian background, rouge accents, gold typography flourishes) with a poster-grid catalog, hover-lift product cards, image lazy-loading, and graceful empty / loading states.
- **Search & filter** — Debounced (200 ms) full-text search (`ilike` on film titles) combined with a category selector across Action, Sci-Fi, Noir Classics, and Horror. Filters compose on the server side for cheap pagination later.
- **Persistent cart** — React Context backed by `localStorage` (`dvdvault_cart`). Cart survives reloads and tab switches; quantities clamp to live stock; duplicate adds merge instead of duplicating rows.
- **Slide-over checkout drawer** — Mounted at the root so cart state persists across route changes. Inline quantity controls, totals memoized, and an explicit "Checkout" action.
- **Order placement** — `POST /orders` validates inventory against current stock, captures `price_at_purchase` for historical accuracy, and writes the order atomically.
- **Order history** — `/orders` page renders collapsible cards for each past purchase. Each card shows order id, formatted date, status pill (completed / pending), grand total, and an expandable detail panel with poster thumbnails, quantities, unit prices, and line totals. Backend route: `GET /orders/me`.
- **Cinematic wishlist** — Tap the heart icon on any film card to save it for later. Hearts animate to movie red on toggle with optimistic updates, and `/wishlist` renders a dedicated grid of saved films. Backed by a many-to-many `WishlistItem` table on the backend.
- **Toast notifications** — Add-to-cart, wishlist toggles, checkout success, and sign-in all emit non-blocking `react-hot-toast` notifications.

### Admin experience

- **Protected dashboard** — `/dashboard` routes are gated by `ProtectedRoute`. Non-admins are redirected to login; admins see the dark sidebar console.
- **Analytics dashboard** — Three live stat cards (Total Revenue, Orders in the last 7 days, Total Films) feeding off `GET /admin/stats`. Below the stat row sit two `recharts` visualisations:
  - **Recent Sales** — An `AreaChart` plotting daily revenue across a zero-filled 7-day window with a rouge gradient fill.
  - **Stock by Category** — A `BarChart` showing live inventory per category in gold, including an "Uncategorized" bucket when relevant.
- **Full product CRUD** — Create, edit, and delete films via a modal-driven workflow with controlled-input forms. Confirm dialog on delete to prevent accidental removals.
- **Stock management** — Stock is a first-class column on the product table and is decremented atomically during checkout. Out-of-stock items are filterable.
- **Image management** — Every film carries an `image_url` pointing at a vertical poster. The admin table renders thumbnails with an `onError` fallback so a broken CDN link can never break the UI.

---

## Technical stack

| Layer | Technologies |
| --- | --- |
| **Backend** | FastAPI · SQLModel · PostgreSQL (with SQLite fallback for local dev) · python-jose (JWT) · passlib / bcrypt · SlowAPI (rate limiting) · Gunicorn + Uvicorn workers |
| **Frontend** | React 19 · Vite 5 · React Router 7 · Axios · Context API (Auth + Cart + Wishlist) · Recharts (analytics) · react-hot-toast (notifications) · CSS variables driving a noir theater palette (#09090b / #e11d48 / #eab308) |
| **Testing** | Playwright (headless Chromium) — end-to-end smoke suite with screenshot, trace, and video capture on failure |
| **Infrastructure** | Railway (FastAPI service + managed Postgres) · Vercel (Vite SPA with SPA rewrites) |

---

## Architecture & design patterns

### Thin route, fat service

Route handlers in `backend/main.py` are intentionally minimal: they parse the request, call a single service method, and shape the response. All business logic — password hashing, JWT issuance, stock validation, atomic order writes, analytics aggregation, wishlist toggling — lives in `backend/services.py` under cohesive service classes (`AuthService`, `UserService`, `ProductService`, `CategoryService`, `OrderService`, `WishlistService`, `StatsService`). This keeps controllers boring, makes the services trivially unit-testable in isolation, and prevents request-shape concerns from leaking into domain logic.

### Atomic order processing & price snapshotting

`OrderService.create_order` is the safety-critical path:

1. Deduplicates cart line items by `product_id` (summing quantities) so a malformed client cannot exploit multiple lookups.
2. Locks each product row in a single session, verifies live stock against requested quantity.
3. Captures `price_at_purchase` on every `OrderItem` — orders are immutable historical records, not pointers to a mutable price.
4. Decrements stock and flips order status from `pending` → `completed` in a single commit. Any validation failure short-circuits before any inventory is touched.

### Analytics aggregation

`StatsService` powers the admin dashboard:

- `total_revenue()` — Sum of `total_price` across completed orders.
- `orders_last_7_days()` — Pre-fills seven daily buckets keyed by ISO date so the chart always has seven data points, even with zero orders. Naive datetimes from SQLite are coerced to UTC defensively before bucketing.
- `stock_by_category()` — Joins products to categories, sums `stock` per category, and surfaces an "Uncategorized" bucket when orphan products exist.

### Many-to-many: wishlist

`WishlistItem` is a thin join table (`user_id`, `product_id`, `created_at`) with indexed FKs to both sides. `WishlistService.toggle()` performs an upsert-or-delete in a single transaction: if the row exists it's removed, otherwise it's created — returning a boolean so the API can report the resulting state without a follow-up read. The companion `get_for_user()` JOINs the join table against `Product` and orders by `created_at desc`, so the wishlist UI surfaces the most recently saved films first.

### Security middleware

- **Rate limiting** — `slowapi` enforces a per-IP 5/minute cap on `/auth/token`. Brute-force attempts return a clean `429` JSON response instead of stalling the worker.
- **Security headers** — A Starlette `BaseHTTPMiddleware` attaches `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Content-Security-Policy: default-src 'self'`, and `Strict-Transport-Security: max-age=31536000` to every response.
- **Sealed secrets** — `SECRET_KEY` is loaded from the environment; when `ENV=production` the app refuses to boot if the key is absent. `ALLOWED_ORIGINS` is env-driven for CORS, and bcrypt is the only password storage path — no plaintext, ever.
- **Token discipline** — JWTs are HS256, expire after a configurable window (`ACCESS_TOKEN_EXPIRE_MINUTES`), and rotating `SECRET_KEY` invalidates the entire outstanding token pool by design.

---

## API surface

| Method | Path | Auth | Description |
| --- | --- | --- | --- |
| `POST` | `/auth/register` | public | Self-service account creation. Returns `201` with the new user (`is_admin: false`). |
| `POST` | `/auth/token` | public | OAuth2 password flow. Rate-limited to 5/minute per IP. |
| `GET` | `/auth/me` | bearer | Current user profile. |
| `GET` | `/products` | public | Catalog list with optional `category_id` and `search_query` (`ilike`). |
| `POST` | `/products` | admin | Create film. |
| `PUT` | `/products/{id}` | admin | Update film. |
| `DELETE` | `/products/{id}` | admin | Delete film. |
| `GET` | `/categories` | public | Category list. |
| `POST` | `/orders` | bearer | Atomic order placement (stock validation + price snapshot). |
| `GET` | `/orders/me` | bearer | Authenticated user's order history. |
| `GET` | `/wishlist` | bearer | Films in the current user's wishlist (newest first). |
| `POST` | `/wishlist/{product_id}` | bearer | Toggle a film in the wishlist. Returns `{product_id, added}`. |
| `GET` | `/admin/stats` | admin | `total_revenue`, `orders_last_7_days`, `stock_by_category`. |

---

## Setup & installation

### Prerequisites

- Python 3.11+
- Node.js 22.4+
- npm 10+

### Backend

```bash
python3 -m venv venv
source venv/bin/activate
pip install -r backend/requirements.txt
cd backend
python seed.py            # populates SQLite (ecommerce.db) with 4 categories, 10 films, admin user
uvicorn main:app --reload
```

The seeded admin is `admin@dvdvault.dev` / `AdminPass123!`. **Rotate this credential before any non-local deployment.**

The API is now live at `http://localhost:8000`. Interactive docs at `http://localhost:8000/docs`.

### Frontend

```bash
cd frontend
npm install
echo "VITE_API_URL=http://localhost:8000" > .env
npm run dev
```

The app is now live at `http://localhost:5173`.

---

## Deployment & environment

### Environment variables

#### Backend (Railway)

| Variable | Required | Description |
| --- | --- | --- |
| `DATABASE_URL` | yes (in prod) | Postgres connection string. Railway injects this automatically. Legacy `postgres://` URLs are normalized to `postgresql+psycopg2://`. Falls back to local SQLite if unset. |
| `SECRET_KEY` | yes (in prod) | JWT signing secret. App refuses to start when missing under `ENV=production`. |
| `ENV` | yes (in prod) | Set to `production` to enforce secret-key validation and disable the dev fallback. |
| `ALLOWED_ORIGINS` | yes (in prod) | Comma-separated list of allowed CORS origins, e.g. `https://dvdvault.vercel.app`. |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | no | JWT lifetime in minutes. Defaults to `60`. |

#### Frontend (Vercel)

| Variable | Required | Description |
| --- | --- | --- |
| `VITE_API_URL` | yes | Public URL of the deployed Railway backend, e.g. `https://dvdvault.up.railway.app`. |

### Backend → Railway

1. Create a new Railway project and provision a Postgres database. Railway injects `DATABASE_URL` into linked services automatically.
2. Add a service from this GitHub repository and set the **Root Directory** to `backend/`.
3. Railway detects the `Procfile`:
   ```
   web: gunicorn -w 4 -k uvicorn.workers.UvicornWorker -b 0.0.0.0:$PORT main:app
   ```
4. Set the env vars from the table above (`SECRET_KEY`, `ENV=production`, `ALLOWED_ORIGINS`).
5. Deploy. The FastAPI lifespan handler calls `SQLModel.metadata.create_all(engine)` on first boot, creating the schema on Postgres.
6. Seed the production database by exporting Railway's `DATABASE_PUBLIC_URL` locally and running `python seed.py` once.

### Frontend → Vercel

1. Import the repository into Vercel and set the **Root Directory** to `frontend/`.
2. Framework preset: **Vite**. Build command: `npm run build`. Output directory: `dist`.
3. Add `VITE_API_URL` pointing at the Railway URL.
4. `vercel.json` ships the SPA rewrite so React Router deep links (e.g. `/dashboard/products`, `/orders`, `/wishlist`) resolve correctly on refresh.

---

## Testing

End-to-end smoke tests live in `frontend/tests/production.spec.ts` and run against any URL via the `BASE_URL` env var. They validate the two critical paths: the storefront renders films and an admin can sign in and see the Dashboard link in the navbar.

### Run locally

```bash
cd frontend
npm install                                 # installs @playwright/test
npx playwright install chromium             # one-time browser download
BASE_URL=http://localhost:5173 npm run test:e2e
```

### Run against production

```bash
BASE_URL=https://dvdvault.vercel.app \
ADMIN_EMAIL=admin@dvdvault.dev \
ADMIN_PASSWORD=AdminPass123! \
npm run test:e2e
```

The Playwright runner executes headless Chromium, retains screenshots, traces, and videos only on failure, and writes an HTML report to `playwright-report/`. View it with:

```bash
npm run test:e2e:report
```

---

## Project layout

```
backend/
  main.py            FastAPI app, routes (auth, products, categories, orders, wishlist, admin/stats), middleware
  models.py          SQLModel tables (User, Category, Product, Order, OrderItem, WishlistItem)
  schemas.py         Pydantic request / response schemas (incl. AdminStatsResponse)
  services.py        AuthService, UserService, ProductService, CategoryService, OrderService, WishlistService, StatsService
  database.py        Env-driven engine (Postgres in prod, SQLite local)
  seed.py            Demo data (4 film categories + 10 films) + admin bootstrap
  Procfile           Railway start command (gunicorn + uvicorn workers, $PORT-bound)
  requirements.txt   Pinned production dependencies
frontend/
  src/
    api/client.js              axios instance + auth interceptor
    auth/                      AuthContext + ProtectedRoute
    context/CartContext        cart state + localStorage persistence (dvdvault_cart)
    context/WishlistContext    wishlist state + optimistic toggle + toast feedback
    components/                Modal, ShopCard (poster aspect ratio + heart toggle), CartDrawer, PublicNavbar, DashboardLayout, AddProductForm
    pages/                     Storefront, Login, Register, Orders, Wishlist, Dashboard, Products
    styles/theme.css           Noir theater palette (CSS variables)
  tests/production.spec.ts     Playwright smoke suite
  playwright.config.ts         Headless Chromium config + failure artifacts
  vercel.json                  SPA rewrite for React Router
  .env                         VITE_API_URL (local)
```

---

## Secrets hygiene

- No secrets are hardcoded anywhere in the repository.
- `.env` files are git-ignored; inject configuration via Railway and Vercel project settings.
- Rotating `SECRET_KEY` invalidates every outstanding JWT — by design.
- Always replace the seeded admin credential before exposing the app to the public internet.
