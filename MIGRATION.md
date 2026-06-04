# Dwelloro — Migration Checklist: Leave Emergent → Pure Node

> **Goal:** Drop the Python reverse proxy entirely. Run Dwelloro as a single Node.js service on your own infrastructure (local, Docker, or AWS).
>
> **Time required:** ~15 minutes for local, ~1 hour for AWS production.

---

## Phase 1 — Local validation (do this first)

Confirm pure-Node works on your machine **before** touching production or deleting anything.

### ☐ 1.1 Pull the latest code locally

```bash
git clone <your-repo-url> dwelloro
cd dwelloro
```

### ☐ 1.2 Set up local env files

```bash
cp .env.example .env                              # docker-compose secrets
cp backend-node/.env.example backend-node/.env    # Node config
cp frontend/.env.example frontend/.env            # Frontend config
```

### ☐ 1.3 (Optional) Add a real Anthropic key

Edit `/app/backend-node/.env` (and `/app/.env` for Docker):
```env
ANTHROPIC_API_KEY=sk-ant-api03-your-real-key-here
```
Skip this step if you want to validate with the dummy fallback first.

### ☐ 1.4 Boot the stack

**Docker (recommended):**
```bash
docker compose up
```

**Manual:**
```bash
# Terminal 1
cd backend-node && yarn install && NODE_PORT=8001 node server.js

# Terminal 2
cd frontend && yarn install && yarn start
```

### ☐ 1.5 Smoke test

- [ ] Visit **http://localhost:3000**
- [ ] Sign in as `manager@dwelloro.demo` / `Demo!123`
- [ ] Confirm Dashboard shows 3 sample properties + Portfolio Intelligence card
- [ ] Open a property → confirm Property Intelligence panel renders
- [ ] Visit **http://localhost:3000/portfolio/trends** → confirm chart renders
- [ ] Report an issue as tenant → confirm ticket is created (AI gives fallback if dummy key)

### ☐ 1.6 Run the test suite

```bash
cd backend
python3 -m venv .venv && source .venv/bin/activate
pip install pytest requests pillow
REACT_APP_BACKEND_URL=http://localhost:8001 pytest tests/ -v
```
Expected: **44 passed**.

✅ **If all steps pass, the pure-Node stack works.** Proceed to Phase 2.

---

## Phase 2 — Delete Python (safe to do now)

### ☐ 2.1 Delete the Python backend folder

```bash
rm -rf /app/backend
```

This removes:
- `/app/backend/server.py` (100-line proxy)
- `/app/backend/Dockerfile`
- `/app/backend/requirements.txt`
- `/app/backend/tests/` (44 pytest cases — see 2.3 below to relocate)

### ☐ 2.2 Remove the Python service from docker-compose.yml

It's already commented out. Delete the entire commented block (lines starting with `# python-gateway:`) to keep the file clean.

### ☐ 2.3 Move tests to the Node folder (optional but recommended)

The pytest suite hits HTTP endpoints, so it still works against a pure-Node backend. Either:

**Option A — Keep pytest:**
```bash
mkdir -p tests
mv /app/backend/tests/* tests/
mv /app/backend/requirements.txt tests/requirements.txt
# Run with: REACT_APP_BACKEND_URL=http://localhost:8001 pytest tests/
```

**Option B — Rewrite in Node (Jest/Vitest):**
Out of scope for this checklist. Existing pytest covers the same surface.

### ☐ 2.4 Update root `.gitignore`

```
# Add if not present
backend-node/.env
.env
frontend/.env
```

### ☐ 2.5 Commit

```bash
git add .
git rm -rf backend/
git commit -m "Migrate to pure Node backend; remove Python proxy"
git push
```

---

## Phase 3 — Production deployment (AWS)

Three AWS-native options. Pick one based on team comfort.

### Option A — ECS Fargate (recommended for production)

**Prerequisites:** AWS account, domain name, MongoDB Atlas cluster (Sydney region for NZ).

**Steps:**

#### ☐ 3.A.1 Set up MongoDB Atlas
1. Create cluster at https://cloud.mongodb.com (M10 tier minimum for prod)
2. **Database Access** → create user `dwelloro-app` with `readWrite` on `dwelloro_prod`
3. **Network Access** → for now, allow `0.0.0.0/0` (lock down in 3.A.6)
4. Copy the SRV connection string

#### ☐ 3.A.2 Store secrets in AWS Secrets Manager
```bash
aws secretsmanager create-secret --name dwelloro/mongo-url \
  --secret-string "mongodb+srv://dwelloro-app:PASS@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority"
aws secretsmanager create-secret --name dwelloro/jwt-secret \
  --secret-string "$(openssl rand -hex 32)"
aws secretsmanager create-secret --name dwelloro/anthropic-key \
  --secret-string "sk-ant-api03-your-real-key-here"
aws secretsmanager create-secret --name dwelloro/resend-key \
  --secret-string "re_your_resend_key"
```

#### ☐ 3.A.3 Build & push Docker images to ECR
```bash
aws ecr create-repository --repository-name dwelloro-node
aws ecr create-repository --repository-name dwelloro-frontend

# Login
aws ecr get-login-password --region ap-southeast-2 | \
  docker login --username AWS --password-stdin <AWS_ACCT>.dkr.ecr.ap-southeast-2.amazonaws.com

# Build & push Node
docker build -t dwelloro-node ./backend-node
docker tag dwelloro-node:latest <AWS_ACCT>.dkr.ecr.ap-southeast-2.amazonaws.com/dwelloro-node:latest
docker push <AWS_ACCT>.dkr.ecr.ap-southeast-2.amazonaws.com/dwelloro-node:latest

# Build & push Frontend (use the prod stage)
docker build --target prod -t dwelloro-frontend ./frontend
docker tag dwelloro-frontend:latest <AWS_ACCT>.dkr.ecr.ap-southeast-2.amazonaws.com/dwelloro-frontend:latest
docker push <AWS_ACCT>.dkr.ecr.ap-southeast-2.amazonaws.com/dwelloro-frontend:latest
```

#### ☐ 3.A.4 Create ECS task definition

Minimal task definition (`task-def.json`):
```json
{
  "family": "dwelloro-node",
  "networkMode": "awsvpc",
  "requiresCompatibilities": ["FARGATE"],
  "cpu": "512",
  "memory": "1024",
  "executionRoleArn": "arn:aws:iam::<ACCT>:role/ecsTaskExecutionRole",
  "containerDefinitions": [{
    "name": "node",
    "image": "<ACCT>.dkr.ecr.ap-southeast-2.amazonaws.com/dwelloro-node:latest",
    "portMappings": [{ "containerPort": 8002, "protocol": "tcp" }],
    "environment": [
      { "name": "DB_NAME", "value": "dwelloro_prod" },
      { "name": "NODE_PORT", "value": "8002" },
      { "name": "APP_PUBLIC_URL", "value": "https://app.dwelloro.co.nz" },
      { "name": "ANTHROPIC_MODEL", "value": "claude-sonnet-4-5-20250929" }
    ],
    "secrets": [
      { "name": "MONGO_URL", "valueFrom": "arn:aws:secretsmanager:ap-southeast-2:<ACCT>:secret:dwelloro/mongo-url" },
      { "name": "JWT_SECRET", "valueFrom": "arn:aws:secretsmanager:ap-southeast-2:<ACCT>:secret:dwelloro/jwt-secret" },
      { "name": "ANTHROPIC_API_KEY", "valueFrom": "arn:aws:secretsmanager:ap-southeast-2:<ACCT>:secret:dwelloro/anthropic-key" },
      { "name": "RESEND_API_KEY", "valueFrom": "arn:aws:secretsmanager:ap-southeast-2:<ACCT>:secret:dwelloro/resend-key" }
    ],
    "logConfiguration": {
      "logDriver": "awslogs",
      "options": {
        "awslogs-group": "/ecs/dwelloro",
        "awslogs-region": "ap-southeast-2",
        "awslogs-stream-prefix": "node"
      }
    }
  }]
}
```

Register: `aws ecs register-task-definition --cli-input-json file://task-def.json`

#### ☐ 3.A.5 Wire up the rest
- [ ] **Application Load Balancer** in front of the Node service (terminates TLS via ACM cert)
- [ ] **Route 53** record `api.dwelloro.co.nz` → ALB
- [ ] **CloudFront + S3** for the frontend (push `frontend/build` to S3, fronted by CloudFront)
- [ ] **Route 53** record `app.dwelloro.co.nz` → CloudFront
- [ ] Set `REACT_APP_BACKEND_URL=https://api.dwelloro.co.nz` in your frontend build env before `yarn build`

#### ☐ 3.A.6 Lock down
- [ ] Atlas Network Access → remove `0.0.0.0/0`, add your VPC's NAT gateway IP (or set up VPC peering)
- [ ] ECS security group → only allow ingress from ALB on port 8002
- [ ] Rotate the JWT_SECRET if it was ever in a `.env` file in git history

### Option B — EC2 + PM2 (simpler, less scalable)
1. Launch an EC2 instance (t3.small, Ubuntu 22.04)
2. Install Node 20 + git + nginx
3. Clone repo, `yarn install`, create `/etc/dwelloro.env` with prod secrets (mode 600)
4. Use PM2 to run `node server.js` with `EnvironmentFile=/etc/dwelloro.env`
5. Nginx reverse proxy on `:443` → Node `:8002`, with Let's Encrypt cert

### Option C — App Runner (managed, easiest)
1. Connect ECR image (from 3.A.3) to AWS App Runner
2. Set env vars via console → linked to Secrets Manager
3. App Runner auto-provisions a TLS endpoint
4. Route 53 → App Runner endpoint

---

## Phase 4 — Post-deploy verification

### ☐ 4.1 Smoke test production
- [ ] Visit your frontend URL — landing page loads
- [ ] Sign in with `manager@dwelloro.demo` (seed runs on first Node boot)
- [ ] Create a real property + ticket — confirm round-trip works
- [ ] Upload a photo — confirm storage works
- [ ] Wait 30s, then verify AI triage runs (Claude returns urgency + category, no `_ai_disabled` flag)

### ☐ 4.2 Set up monitoring
- [ ] **CloudWatch Logs** for ECS task logs
- [ ] **CloudWatch Alarms** on:
  - Node task health check failures
  - 5xx response rate from ALB > 1%
  - Memory utilization > 80%
- [ ] **Atlas alerts** on connection count, slow queries

### ☐ 4.3 Set up backups
- [ ] Atlas continuous backups (included on M10+)
- [ ] Verify point-in-time recovery works by restoring to a test DB

### ☐ 4.4 Delete demo data before public launch
```bash
# Connect to prod via mongosh or Atlas Data Explorer
db.users.deleteMany({ email: /@dwelloro\.demo$/ })
db.properties.deleteMany({ address: { $in: ["12 Smith Street", "88 Lake Avenue", "5 Queen Road"] } })
db.compliance.deleteMany({ property_id: { $exists: true } })  # if no real props yet
```
Or comment out the `seed()` call in `server.js` for prod builds.

---

## Quick reference

### Service ports
| Service | Local | Docker | Production |
|---|---|---|---|
| Node API | 8001 or 8002 | 8001 + 8002 (both) | 8002 (behind ALB on 443) |
| Frontend | 3000 | 3000 | CloudFront/S3 |
| MongoDB | 27017 | 27017 | Atlas (SRV, internal) |

### What you no longer need after migration
- ❌ Python runtime
- ❌ `emergentintegrations` package
- ❌ `uvicorn`, `fastapi`, `httpx`, `motor`, `pymongo`
- ❌ Cross-service HTTP hops
- ❌ Emergent supervisor

### What's still required
- ✅ Node.js 20+
- ✅ MongoDB (local or Atlas)
- ✅ Anthropic API key (real, for production AI)
- ✅ Resend API key (optional, for emails)

---

## Rollback plan

If anything breaks in production:
1. **Database is safe** — Atlas has point-in-time backups
2. **Code rollback** — `git revert` the migration commit, redeploy old image from ECR (you should keep the last 5 ECR image tags)
3. **DNS rollback** — flip Route 53 record back to old endpoint (takes ~60s with low TTL)

Set your Route 53 TTL to 60s **before** cutover so rollback is fast.

---

**Done.** You're now running Dwelloro as a single-language Node stack on your own infrastructure, with full control over costs, scaling, and data residency.
