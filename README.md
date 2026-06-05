# Dwelloro — Local Development Guide

Dwelloro is a Healthy Homes + rental maintenance intelligence SaaS. This guide gets you running on localhost in either **(a) Docker mode** (one command) or **(b) manual mode** (run each service directly).

> **Architecture note:** Dwelloro runs on a **single Node.js backend** (Fastify + Mongoose + Anthropic SDK). A thin Python reverse proxy (`/app/backend/`) is retained **only** for the Emergent preview pod where supervisor expects uvicorn on port 8001. For local, Docker, and AWS deployments, you can ignore or delete the Python folder entirely.

---

## Architecture

<img width="1536" height="1024" alt="image" src="https://github.com/user-attachments/assets/82db843e-2aca-42b8-8796-51fbdc9eb58f" />


---

## Option A — Docker (recommended, one command)

### Prerequisites
- [Docker Desktop](https://www.docker.com/products/docker-desktop/) (includes `docker compose`)
- That's it. No Node, no MongoDB install required.

### 1. Set your secrets

```bash
cp .env.example .env
```

Edit `.env` and paste your `ANTHROPIC_API_KEY` from [console.anthropic.com](https://console.anthropic.com/). You can leave it as the dummy value — AI calls will fall back to safe defaults until you add a real key.

### 2. Start everything

```bash
docker compose up
```

First boot takes ~2 minutes (downloading images, installing deps). Subsequent starts take ~10 seconds.

You should see:
- **MongoDB** booting on `:27017`
- **Node API** booting on `:8001` (also exposed on `:8002`), seeds 5 demo accounts + 3 sample properties
- **Frontend** booting on `:3000`

Open **http://localhost:3000** and sign in with:
```
Email:    manager@dwelloro.demo
Password: Demo!123
```

### 3. Stop / clean up

```bash
# Stop (keeps data)
docker compose down

# Stop + wipe MongoDB data (full reset)
docker compose down -v

# Rebuild after changing Dockerfiles or package.json
docker compose up --build
```

### 4. View logs / run one-off commands

```bash
# Tail logs from a specific service
docker compose logs -f node-api
docker compose logs -f frontend

# Open a shell inside a container
docker compose exec node-api sh
docker compose exec mongo mongosh

# Run the backend test suite
docker compose exec node-api yarn install --dev  # one-time, if needed
REACT_APP_BACKEND_URL=http://localhost:8001 pytest /app/backend/tests/ -v
```

### Hot reload
Source files are mounted as volumes, so:
- Frontend changes → reload in browser automatically
- Node changes → restart `node-api` container: `docker compose restart node-api`

---

## Option B — Manual setup (run each service yourself)

### Prerequisites
| Tool | Version |
|---|---|
| Node.js | ≥ 20 |
| Yarn | ≥ 1.22 (don't use npm) |
| MongoDB | running on `mongodb://localhost:27017` |
| Python | ≥ 3.11 *(optional — only for running the regression test suite)* |

#### Install MongoDB locally

**macOS:**
```bash
brew tap mongodb/brew
brew install mongodb-community
brew services start mongodb-community
```

**Ubuntu / Debian:**
```bash
sudo apt update && sudo apt install -y mongodb
sudo systemctl start mongod
sudo systemctl enable mongod
```

Verify:
```bash
mongosh --eval "db.runCommand({ping: 1})"
```

### 1. Configure environment files

Copy each template to a real `.env`:

```bash
cp backend-node/.env.example backend-node/.env
cp frontend/.env.example frontend/.env
```

Open `backend-node/.env` and paste your `ANTHROPIC_API_KEY` (or leave dummy for now — AI falls back to safe defaults).

### 2. Install dependencies (one-time)

Open **two terminals** at the repo root.

**Terminal A — Node backend:**
```bash
cd backend-node
yarn install
```

**Terminal B — Frontend:**
```bash
cd frontend
yarn install
```

### 3. Run both layers

**Terminal A — Node API (`:8001`):**
```bash
cd backend-node
NODE_PORT=8001 node server.js
# Expect: "Node backend on :8001"
# Seed creates 5 demo accounts + 3 sample properties on first run
```

**Terminal B — Frontend (`:3000`):**
```bash
cd frontend
yarn start
```

Open **http://localhost:3000** → sign in with `manager@dwelloro.demo` / `Demo!123`.

---

## Demo accounts

All use password `Demo!123`. Seeded automatically on Node backend startup.

| Role | Email | What they see |
|---|---|---|
| Property Manager | `manager@dwelloro.demo` | Full portfolio dashboard, all properties, all tickets, contractor leaderboard, compliance matrix |
| Tenant | `tenant@dwelloro.demo` | Report issues, view their own tickets |
| Contractor | `contractor@dwelloro.demo` | Jobs assigned to them |
| Landlord | `landlord@dwelloro.demo` | Read-only view of owned properties + compliance |
| Inspector | `inspector@dwelloro.demo` | Inspection workflow + assigned properties |

### Seeded sample properties
- `12 Smith Street, Mt Eden, Auckland` (tenant assigned)
- `88 Lake Avenue, Hamilton East, Hamilton`
- `5 Queen Road, Brooklyn, Wellington`

Each has 5 Healthy Homes compliance rows pre-created.

---

## Anthropic API key (for real AI)

With a dummy key, the app is fully functional but AI features return safe placeholders:
- `analyze-issue` → `urgency: medium, category: general, _ai_disabled: true`
- `contractor-brief` → basic template `"Issue at {address}: {title}"`
- `inspection-summary` → empty string

To enable real AI:

1. Go to [https://console.anthropic.com/](https://console.anthropic.com/) → Settings → API Keys → Create key
2. Add to `/app/backend-node/.env` (manual) or `/app/.env` (Docker):
   ```env
   ANTHROPIC_API_KEY=sk-ant-api03-your-real-key-here
   ANTHROPIC_MODEL=claude-sonnet-4-5-20250929
   ```
3. Restart Node:
   ```bash
   # Manual
   # Ctrl-C the running node server.js and restart it

   # Docker
   docker compose restart node-api
   ```

Pricing as of writing: ~$3 / 1M input tokens, $15 / 1M output tokens. A typical ticket triage costs ~$0.005.

---

## Running the test suite

```bash
# Manual (requires Python 3.11 for pytest)
cd /app/backend
python3 -m venv .venv && source .venv/bin/activate
pip install pytest requests pillow
REACT_APP_BACKEND_URL=http://localhost:8001 pytest tests/ -v
```

Expected: **44 passed** (13 backend + 18 intelligence + 13 trends).

---

## Pointing at MongoDB Atlas (production)

Replace `MONGO_URL` in `backend-node/.env` (or in your AWS secrets store) with your Atlas connection string:

```env
MONGO_URL=mongodb+srv://dwelloro-app:YOUR_PASSWORD@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority
DB_NAME=dwelloro_prod
```

That's the only change. The application reads MongoDB config purely from environment variables — no code edits needed when moving between local Mongo, Docker Mongo, and Atlas.

For full AWS deployment guidance (Secrets Manager, ECS task definitions, IAM), see the deployment section in the project's PRD.

---

## Environment variables reference

### `/app/backend-node/.env`
| Variable | Required | Default | Notes |
|---|---|---|---|
| `MONGO_URL` | ✅ | `mongodb://localhost:27017` | Connection string (local, Docker DNS, or Atlas) |
| `DB_NAME` | ✅ | `dwelloro_dev` | Database name |
| `JWT_SECRET` | ✅ | `local-dev-secret-change-me` | Long random string in production |
| `ANTHROPIC_API_KEY` | ⚠️ | `sk-ant-DUMMY-KEY-REPLACE-ME` | Dummy keys produce fallback AI responses; real key enables Claude |
| `ANTHROPIC_MODEL` | – | `claude-sonnet-4-5-20250929` | Override to use Opus / Haiku / older Sonnet |
| `NODE_PORT` | – | `8002` | Set to `8001` if frontend points there |
| `APP_PUBLIC_URL` | – | `http://localhost:3000` | Used in email links and share URLs |
| `RESEND_API_KEY` | – | *(blank)* | Optional — contractor emails skipped if missing |
| `SENDER_EMAIL` | – | `onboarding@resend.dev` | Reply-from address |
| `EMERGENT_LLM_KEY` | – | *(blank)* | Only needed for Emergent Object Storage init |

### `/app/frontend/.env`
| Variable | Default | Notes |
|---|---|---|
| `REACT_APP_BACKEND_URL` | `http://localhost:8001` | Point at your Node backend |
| `WDS_SOCKET_PORT` | `0` | Keep as-is for CRA hot reload |

---

## Project layout

```
/app
├── docker-compose.yml          # One-command local stack (Mongo + Node + Frontend)
├── .env.example                # docker-compose secrets template
├── backend-node/               # ✅ THE backend — single Node service
│   ├── Dockerfile
│   ├── .env.example
│   ├── server.js               # Fastify routes + Mongoose models + JWT + Resend
│   ├── ai.js                   # Anthropic SDK (Claude Sonnet vision + text)
│   ├── intelligence.js         # Risk scoring / seasonal / cost / alerts / trends
│   └── package.json
├── backend/                    # ⚠️ DEPRECATED — thin Python proxy (Emergent pod only)
│   ├── Dockerfile              #    Delete this whole folder when leaving Emergent
│   ├── server.py               #    Pure reverse proxy, no business logic
│   ├── requirements.txt
│   └── tests/                  # 44 pytest cases (hit the API from outside)
├── frontend/                   # React SPA
│   ├── Dockerfile              # Multi-stage: dev | build | prod
│   ├── .env.example
│   ├── package.json
│   └── src/
└── memory/
    ├── PRD.md
    └── test_credentials.md
```

---

## What changed from the original architecture?

Dwelloro originally ran on a **hybrid Python + Node backend** because the Emergent Universal LLM Key only worked via the Python `emergentintegrations` library. We've since migrated to a **pure Node backend** using the official Anthropic SDK directly. The Python folder is now a 100-line reverse proxy retained only for the Emergent preview pod's supervisor — you can safely delete it when self-hosting.

**Trade-off:** You now manage Anthropic billing directly (lose Universal Key convenience), but gain a single-language stack with native Node tooling and no inter-service hops.
