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
```

There is no test runner wired in the backend `package.json`. Integration tests live in `backend/tests/` and require Python pytest:
```bash
cd backend
python3 -m venv .venv && source .venv/bin/activate
pip install pytest requests pillow
REACT_APP_BACKEND_URL=http://localhost:8001 pytest tests/ -v
# Expected: 44 passed
```

## Environment variables

Copy `.env.example` to `.env` in the repo root (Docker) and in `backend/` (manual). Key vars:

| Variable | Notes |
|---|---|
| `NODE_PORT` | Backend port, default `8002`; frontend points to `8001` by default |
| `MONGO_URL` | MongoDB connection string |
| `JWT_SECRET` | Sign/verify all Bearer tokens |
| `ANTHROPIC_API_KEY` | Without a real key, AI features return safe placeholder responses |
| `ANTHROPIC_MODEL` | Default `claude-sonnet-4-5-20250929` |
| `STRIPE_API_KEY` | Without a real key, billing routes return dummy Stripe flow |
| `RESEND_API_KEY` | Optional — contractor emails are silently skipped if absent |
| `AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY` | File uploads go to S3 bucket `dwelloro-202029085297-ap-southeast-2-an` |

Frontend only needs `REACT_APP_BACKEND_URL` (default `http://localhost:8002`).

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
      constants.js       # COMPLIANCE_AREAS, ROOM_CHECKS, shared enums
    db/seed.js           # Seeds 5 demo users + 3 properties + compliance rows on every boot (idempotent)
    middleware/
      auth.js            # JWT Bearer verification → sets req.user
      requireRoles.js    # requireRoles('property_manager', 'inspector') factory for preHandler
    models/              # Mongoose schemas: User, Property, Ticket, Compliance, Inspection, FileRef, PaymentTxn
    routes/              # One file per domain: auth, properties, tickets, compliance, inspections,
                         # contractors, intelligence, notifications, uploads, billing, admin, ai, public
    services/            # Re-exports from top-level ai.js and intelligence.js (namespace shim)
    utils/helpers.js     # strip() (sanitize Mongoose docs), now(), planLimitFor(tier)

frontend/
  src/
    lib/api.js           # axios apiClient, AuthProvider/useAuth (JWT in localStorage), fileUrl()
    App.js               # BrowserRouter + all routes; <Private> guard wraps authenticated pages
    pages/               # One file per route/view
    components/          # AppShell (nav/layout), shared UI, PortfolioIntelligence, PropertyIntelligence
```

### Key architectural patterns

**Auth flow:** `POST /api/auth/login` returns `{ access_token, user }`. Token stored in `localStorage` under key `miq_token`. Every `apiClient` request injects `Authorization: Bearer <token>` via an axios interceptor. Backend verifies with `authenticate` preHandler and exposes `req.user` (decoded JWT payload including `role`).

**Role-based access:** Five roles — `property_manager`, `tenant`, `contractor`, `landlord`, `inspector`. Routes use `{ preHandler: requireRoles('property_manager') }` for role enforcement.

**Plan tiers:** `free` (3 properties), `starter` (25), `pro` (100), `enterprise` (unlimited). Enforced in billing and property-creation routes via `planLimitFor(tier)` in `utils/helpers.js`. Billing uses Stripe Checkout; webhook at `POST /api/billing/webhook` updates `plan_tier` on the user.

**AI features (Claude):** Three entry points in `backend/ai.js` — `analyzeIssue` (ticket triage with optional image base64 list), `generateContractorBrief` (tradesperson work order), `summarizeInspection` (room-by-room inspection summary). All functions fall back gracefully when `ANTHROPIC_API_KEY` is a dummy key.

**File uploads:** Multipart uploads land at `POST /api/upload`; files go to AWS S3. `FileRef` model tracks file metadata. `fileUrl(path)` in `lib/api.js` constructs public URLs.

**Healthy Homes compliance:** Five areas defined in `constants.js` (`heating`, `insulation`, `ventilation`, `moisture`, `draught_stopping`). One `Compliance` document per area per property. Seeded automatically on first boot.

**Demo accounts (all use `Demo!123`):**
- `manager@dwelloro.demo` — property_manager (enterprise tier)
- `tenant@dwelloro.demo` — tenant
- `contractor@dwelloro.demo` — contractor
- `landlord@dwelloro.demo` — landlord
- `inspector@dwelloro.demo` — inspector

### Package manager

Use **yarn** for both frontend and backend. Do not use npm.
