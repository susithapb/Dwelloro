# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What is Dwelloro

Dwelloro is a Healthy Homes + rental maintenance intelligence SaaS for New Zealand property managers. It handles maintenance tickets, Healthy Homes compliance tracking, property inspections, contractor management, and AI-powered issue triage.

## Development commands

### Backend (Node.js / Fastify)
```bash
cd backend
yarn install           # one-time
node src/server.js     # starts on :8002 by default; set NODE_PORT=8001 to match frontend default
```

### Frontend (React / CRA via craco)
```bash
cd frontend
yarn install           # one-time
yarn start             # starts on :3000
yarn build             # production build
```

### Docker (full stack in one command)
```bash
docker compose up          # Mongo :27017, Node API :8001/:8002, Frontend :3000
docker compose down -v     # full reset including MongoDB data
docker compose up --build  # rebuild after Dockerfile or package.json changes
docker compose logs -f node-api   # tail backend logs
docker compose restart node-api   # apply Node source changes (no hot reload)
```

Node.js ≥ 20 is required for manual setup. There is no test runner wired in the backend `package.json` and no test files currently exist in the repo. Frontend has `craco test` available but no test files exist yet.

## Environment variables

Copy `.env.example` to `.env` in the repo root (Docker) and in `backend/` (manual). Key vars:

| Variable | Notes |
|---|---|
| `NODE_PORT` | Backend port, default `8002`; frontend points to `8001` by default |
| `MONGO_URL` | MongoDB connection string |
| `JWT_SECRET` | Sign/verify all Bearer tokens; auto-generates ephemeral secret if unset (sessions lost on restart) |
| `ANTHROPIC_API_KEY` | Without a real key, AI features return safe placeholder responses |
| `ANTHROPIC_MODEL` | Default `claude-sonnet-4-5-20250929` |
| `STRIPE_API_KEY` | Without a real key, billing routes return dummy Stripe flow |
| `RESEND_API_KEY` | Optional — contractor emails are silently skipped if absent |
| `DB_NAME` | MongoDB database name, default `dwelloro_dev` |
| `APP_PUBLIC_URL` | Base URL for email links, share URLs, and CORS origin; e.g. `http://localhost:3000` |
| `SENDER_EMAIL` | Reply-from address for Resend emails, default `onboarding@resend.dev` |
| `AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY` | File uploads go to S3 bucket `propintel-202029085297-ap-southeast-2-an` |

Frontend only needs `REACT_APP_BACKEND_URL` (default `http://localhost:8002`).

Note: `APP_NAME` in `env.js` defaults to `maintainiq` — a legacy artifact; it is not user-facing.

## Architecture

```
backend/
  ai.js                  # Top-level Anthropic SDK module (analyzeIssue, generateContractorBrief, summarizeInspection)
  intelligence.js        # Risk scoring, seasonal patterns, cost intelligence, portfolio trends
  src/
    server.js            # Entry point: connectDB → seed → buildApp → listen
    app.js               # Fastify instance, plugin registration, route prefixes
    config/
      env.js             # Typed env config (single source of truth for process.env)
      constants.js       # COMPLIANCE_AREAS, ROOM_CHECKS, CONTRACTOR_TRADES, shared enums
    db/seed.js           # Seeds 5 demo users + 3 properties + compliance rows on every boot (idempotent)
    middleware/
      auth.js            # JWT Bearer verification → sets req.user
      requireRoles.js    # requireRoles('property_manager', 'inspector') factory for preHandler
    models/              # Mongoose schemas: User, Property, Ticket, Compliance, Inspection, FileRef, PaymentTxn
    routes/              # One file per domain: auth, properties, tickets, compliance, inspections,
                         # contractors, intelligence, notifications, uploads, billing, admin, ai, public
    services/
      ai.js              # Shim re-exporting backend/ai.js
      intelligence.js    # Shim re-exporting backend/intelligence.js
      notify.js          # Resend email (password reset, contractor assignment emails)
      risk.js            # Risk scoring calculations
      storage.js         # S3 upload helpers (used by uploads route)
    utils/
      helpers.js         # strip() (sanitize Mongoose docs), now(), planLimitFor(tier)
      validate.js        # Input validation helpers: collect(), required(), validEmail(), minLen(), oneOf()

frontend/
  src/
    lib/api.js           # axios apiClient, AuthProvider/useAuth (JWT in localStorage), fileUrl()
    lib/utils.js         # cn() Tailwind class merge helper
    App.js               # BrowserRouter + all routes; <Private> guard wraps authenticated pages
    pages/               # One file per route/view
    components/          # AppShell (nav/layout), shared UI, PortfolioIntelligence, PropertyIntelligence
    components/ui/       # shadcn/ui components (Radix primitives + Tailwind)
    hooks/use-toast.js   # Toast state hook
```

### Key architectural patterns

**Auth flow:** `POST /api/auth/login` returns `{ access_token, user }`. Token stored in `localStorage` under key `miq_token`. Every `apiClient` request injects `Authorization: Bearer <token>` via an axios interceptor. A 401 response auto-redirects to `/login` and clears storage. Backend verifies with `authenticate` preHandler and exposes `req.user` (decoded JWT payload including `role`). Tokens expire after 72 hours. Auth endpoints (`/register`, `/login`) are rate-limited to 10 requests per 15 minutes.

**Role-based access:** Five roles — `property_manager`, `tenant`, `contractor`, `landlord`, `inspector`. Routes use `{ preHandler: requireRoles('property_manager') }` for role enforcement.

**Plan tiers:** `free` (3 properties), `starter` (25), `pro` (100), `enterprise` (unlimited). Enforced in billing and property-creation routes via `planLimitFor(tier)` in `utils/helpers.js`. Billing uses Stripe Checkout; webhook at `POST /api/billing/webhook` updates `plan_tier` on the user.

**AI features (Claude):** Three entry points in `backend/ai.js` — `analyzeIssue` (ticket triage with optional image base64 list), `generateContractorBrief` (tradesperson work order), `summarizeInspection` (room-by-room inspection summary). All functions fall back gracefully when `ANTHROPIC_API_KEY` is a dummy key.

**File uploads:** Multipart uploads land at `POST /api/upload`; files go to AWS S3 via `services/storage.js`. `FileRef` model tracks file metadata. `fileUrl(path)` in `lib/api.js` constructs public URLs. File size limit is 15 MB per file; request body limit is 20 MB.

**Route prefixes:** Most routes register under `api/<domain>`. Exceptions: `uploads`, `contractors`, `public`, and `admin` register without a prefix — their handlers define their own full paths.

**Mongoose data model patterns:** All models define a custom UUID `id` field (not MongoDB's `_id`) as the primary identifier, indexed and unique. All timestamps (`created_at`, `updated_at`, `scheduled_at`, etc.) are stored as ISO 8601 strings, not `Date` objects. Use `strip()` from `utils/helpers.js` to convert Mongoose documents to plain objects before returning them.

**Ticket lifecycle:** `status` progresses through `open → in_progress → resolved`. Each status change appends an entry to the `timeline` array. Quotes have their own sub-state fields (`quote_amount`, `quote_approved_at`, etc.) on the same document.

**Healthy Homes compliance:** Five areas defined in `constants.js` (`heating`, `insulation`, `ventilation`, `moisture`, `draught_stopping`). One `Compliance` document per area per property. Seeded automatically on first boot. Inspection room checks use a separate set: `moisture`, `ventilation`, `heating`, `draught`, `condition`.

**Contractor trades:** Defined in `constants.js` as `CONTRACTOR_TRADES` — `plumber`, `electrician`, `builder`, `painter`, `hvac`, `locksmith`, `roofer`, `general_maintenance`, `other`.

**Public (unauthenticated) routes:** `GET /share/property/:id` (property share report) and the password reset flow (`/forgot-password`, `/reset-password`) do not require authentication. These are handled by `routes/public.js`.

**Frontend UI stack:** Tailwind CSS with shadcn/ui components (Radix primitives). Import path alias `@/` maps to `frontend/src/`. New UI primitives go in `components/ui/`. Use the `cn()` helper from `lib/utils.js` for conditional class merging. Toast notifications use Sonner (`<Toaster>` in `App.js`).

**CORS:** Restricted to `APP_PUBLIC_URL` (or `http://localhost:3000` by default). Update this env var when deploying to a new domain.

**Demo accounts (all use `Demo!123`):**
- `manager@dwelloro.demo` — property_manager (enterprise tier)
- `tenant@dwelloro.demo` — tenant
- `contractor@dwelloro.demo` — contractor
- `landlord@dwelloro.demo` — landlord
- `inspector@dwelloro.demo` — inspector

### Package manager

Use **yarn** for both frontend and backend. Do not use npm.
