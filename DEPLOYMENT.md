# Dwelloro — Deployment Plan & Cost Analysis

**Last updated:** Feb 2026
**Stack:** React (CRA) + Node.js (Fastify + Mongoose) + MongoDB + Anthropic Claude
**Target users:** NZ property managers
**Recommended region:** AWS `ap-southeast-2` (Sydney) — lowest latency for NZ

---

## Quick recommendation

| Stage | Recommended option | Monthly cost (excl. usage) |
|---|---|---|
| **MVP / first 10 customers** | Option 2 — Managed PaaS (Railway + Vercel + Atlas) | **NZD ~$45** |
| **Growth / 10–100 customers** | Option 3 — AWS App Runner + S3/CloudFront + Atlas | **NZD ~$170** |
| **Scale / 100+ customers** | Option 4 — AWS ECS Fargate + Atlas M10 + CloudFront | **NZD ~$400** |
| **Learning / personal demo** | Option 1 — Single VPS with Docker | **NZD ~$15** |

> All prices below are converted at NZD 1.00 = USD 0.60 (Feb 2026 rate). Figures exclude one-off setup time and developer salaries.

---

## Option 1 — Budget / Single VPS (DigitalOcean or Hetzner)

**Best for:** Personal demos, internal pilots, very early validation. **Not recommended** for production with paying customers because there's no redundancy.

### Architecture
```
┌─────────────────────────────────────────┐
│  Single VPS (4 GB RAM)                  │
│  ├─ Nginx (TLS termination)             │
│  ├─ Node API (PM2 / systemd)            │
│  ├─ React static build (served by nginx)│
│  └─ MongoDB (local install)             │
└─────────────────────────────────────────┘
```

### Setup steps (high level)
1. Provision Ubuntu 22.04 VPS (Hetzner CCX13 or DO basic)
2. Install Docker + docker-compose
3. Point domain DNS at the VPS IP
4. Run `docker compose -f docker-compose.prod.yml up -d`
5. Configure nginx + Let's Encrypt for TLS

### Cost (monthly NZD)
| Item | Provider | Cost |
|---|---|---|
| VPS (4 GB / 2 vCPU / 80 GB SSD) | Hetzner CCX13 | **$15** |
| Domain (.co.nz) | Any registrar | $2 (amortised) |
| TLS cert | Let's Encrypt | $0 |
| Email | Resend (free tier, 3k/mo) | $0 |
| AI (Anthropic) | Pay-per-use, ~$5 at 1k tickets/mo | usage |
| **Subtotal infrastructure** | | **~$17/mo** |

### Pros
- Cheapest, full control, one box to manage

### Cons
- No automatic backups (you set up cron + S3 yourself)
- Single point of failure — if the box dies, app is down
- MongoDB on the same box = no isolation
- Manual scaling

---

## Option 2 — Managed PaaS (Railway / Render + Vercel + Atlas) ⭐ MVP recommended

**Best for:** MVP through ~10 paying customers. Cheap, fast to ship, scales automatically when you upgrade tiers.

### Architecture
```
┌─────────────────────────────────────┐
│  Vercel (React SPA + CDN)           │
└──────────────┬──────────────────────┘
               ▼
┌─────────────────────────────────────┐
│  Railway (Node API container)       │
└──────────────┬──────────────────────┘
               ▼
┌─────────────────────────────────────┐
│  MongoDB Atlas M0 → M10             │
│  (Sydney region)                    │
└─────────────────────────────────────┘
```

### Setup steps
1. Push code to GitHub
2. **Vercel**: connect frontend repo → `cd frontend && yarn build` → auto-deploys on push
3. **Railway**: connect backend-node repo → Railway autodetects Node, runs `node server.js`, exposes a public URL
4. **MongoDB Atlas**: create M0 cluster in `ap-southeast-2` (Sydney) → paste connection string into Railway env vars
5. **Anthropic + Resend keys**: add to Railway env vars
6. **Custom domain**: Vercel → add `app.dwelloro.co.nz`; Railway → add `api.dwelloro.co.nz`

### Cost (monthly NZD)
| Item | Provider | Cost |
|---|---|---|
| Frontend hosting | Vercel Hobby/Pro | $0 (Hobby) — or **$33** (Pro, recommended for SLA) |
| Backend container | Railway Hobby ($5 credit) | **$8–15** (usage-based, ~512MB / 1 vCPU) |
| MongoDB Atlas M0 | Free tier (512 MB) | $0 — upgrade to M10 (~**$95**) at ~5+ customers |
| Email | Resend (free 3k/mo) | $0 |
| AI (Anthropic) | Pay-per-use | usage |
| Domain | .co.nz | $2 |
| **Subtotal infrastructure (MVP, free tiers)** | | **~$15/mo** |
| **Subtotal infrastructure (5+ customers, paid tiers)** | | **~$130/mo** |

### Pros
- Zero ops — pushes to git auto-deploy
- Automatic backups (Atlas)
- Free SSL, CDN, monitoring built-in
- Easy rollback (one click)

### Cons
- Less control over networking (no VPC peering on Hobby plans)
- Costs ramp once you outgrow free tiers
- Vendor lock-in (you'll rewrite deployment config if you migrate to AWS later)

---

## Option 3 — AWS App Runner + S3/CloudFront + Atlas ⭐ Growth recommended

**Best for:** 10–100 paying customers. AWS-native (data residency / compliance), but still managed enough that you're not building infra.

### Architecture
```
┌─────────────────────────────────────┐
│  CloudFront + S3 (React build)      │
└──────────────┬──────────────────────┘
               ▼
┌─────────────────────────────────────┐
│  AWS App Runner (Node container)    │
│  Auto-scaling 1→5 instances         │
└──────────────┬──────────────────────┘
               ▼
┌─────────────────────────────────────┐
│  MongoDB Atlas M10 (Sydney)         │
│  + VPC peering to AWS               │
└─────────────────────────────────────┘
       │
       └── AWS Secrets Manager (keys)
       └── CloudWatch (logs + alarms)
       └── S3 (object storage for photos)
```

### Setup steps
1. Build Node container, push to ECR
2. Create App Runner service from ECR image
3. Build React → `aws s3 sync build/ s3://dwelloro-frontend`
4. CloudFront distribution → S3 bucket as origin, with ACM cert
5. Route 53 records: `app.dwelloro.co.nz` → CloudFront, `api.dwelloro.co.nz` → App Runner
6. MongoDB Atlas M10 + VPC peering to App Runner's network
7. Store secrets in AWS Secrets Manager, reference from App Runner config

### Cost (monthly NZD)
| Item | Service | Cost |
|---|---|---|
| Backend (App Runner, 1 vCPU / 2 GB, ~24 h/day) | AWS App Runner | **$60–90** |
| Frontend hosting | S3 + CloudFront (low traffic) | **$5** |
| Database | MongoDB Atlas M10 (Sydney) | **$95** |
| Object storage (S3, ~50 GB photos) | AWS S3 | **$3** |
| Secrets Manager (4 secrets) | AWS | **$3** |
| Route 53 hosted zone | AWS | **$1** |
| Email | Resend Pro (50k emails) | **$33** |
| AI (Anthropic) | Pay-per-use | usage |
| Domain | .co.nz | $2 |
| **Subtotal infrastructure** | | **~$200/mo** |

### Pros
- Auto-scaling, zero-downtime deploys, integrated AWS ecosystem
- NZ data residency (Sydney region)
- Secrets Manager + CloudWatch + IAM all properly integrated
- Easy to migrate to ECS Fargate (Option 4) when you outgrow

### Cons
- More complex than Railway/Vercel
- App Runner less flexible than ECS (no sidecar containers, limited networking)

---

## Option 4 — AWS ECS Fargate + ALB + Atlas M10+ (Production-grade)

**Best for:** 100+ paying customers, regulated workloads (SOC 2 / ISO 27001 path), heavy traffic.

### Architecture
```
┌─────────────────────────────────────┐
│       CloudFront + S3 (React)       │
└──────────────┬──────────────────────┘
               ▼
┌─────────────────────────────────────┐
│  Application Load Balancer (HTTPS)  │
└──────────────┬──────────────────────┘
               ▼
┌─────────────────────────────────────┐
│  ECS Fargate Service                │
│  • 2× tasks (1 vCPU / 2 GB each)    │
│  • Auto-scaling 2→10                │
│  • Rolling deploys                  │
└──────────────┬──────────────────────┘
               ▼
┌─────────────────────────────────────┐
│  MongoDB Atlas M10/M20 + VPC peer   │
│  3-node replica set                 │
└─────────────────────────────────────┘
       │
       ├── AWS Secrets Manager
       ├── CloudWatch (logs + alarms)
       ├── S3 (object storage)
       ├── WAF (DDoS / abuse)
       └── SES or Resend (email)
```

### Setup steps
See `/app/MIGRATION.md` Phase 3 Option A for the full task definition + step-by-step. Highlights:
1. Set up VPC with 2 public + 2 private subnets across 2 AZs
2. Push Node image to ECR
3. Create ECS cluster + task definition (references Secrets Manager ARNs)
4. Application Load Balancer in front, with ACM cert
5. Atlas M10 cluster + VPC peering
6. CloudFront + S3 for frontend
7. Route 53 records + ACM certs
8. CloudWatch alarms for 5xx rate, CPU, memory, task health

### Cost (monthly NZD)
| Item | Service | Cost |
|---|---|---|
| ECS Fargate (2 tasks × 1 vCPU / 2 GB, 24/7) | AWS | **$110** |
| Application Load Balancer + data transfer | AWS | **$35** |
| CloudFront + S3 (medium traffic) | AWS | **$15** |
| Database | MongoDB Atlas M10 (Sydney) | **$95** |
| Database (M20 at ~50 customers) | Atlas M20 | **$245** |
| NAT Gateway (private subnet egress) | AWS | **$60** |
| Object storage (S3, ~200 GB) | AWS | **$12** |
| Secrets Manager (6 secrets) | AWS | **$5** |
| Route 53 + DNS queries | AWS | **$3** |
| CloudWatch logs + alarms | AWS | **$15** |
| WAF (optional, recommended) | AWS | **$15** |
| Email | Resend Pro / SES | **$33** |
| AI (Anthropic) | Pay-per-use | usage |
| Domain | .co.nz | $2 |
| **Subtotal at M10** | | **~$415/mo** |
| **Subtotal at M20 (50+ customers)** | | **~$565/mo** |

### Pros ons
- Production-grade — multi-AZ, auto-scaling, zero-downtime deploys
- Full control (sidecars, custom networking, WAF)
- Compliance-ready (SOC 2, ISO 27001 audit trail via CloudTrail)
- Smooth path to higher tiers (M30, M40, sharding)

### Cons
- Expensive at low scale
- Steeper ops curve — needs someone comfortable with AWS


## Usage-based costs (apply to ALL options)

### Anthropic (Claude Sonnet 4.5)
- Issue triage with image: ~3,000 input + 500 output tokens = **NZD $0.022 per ticket**
- Contractor brief: ~500 input + 400 output tokens = **NZD $0.014 per ticket**
- Inspection summary: ~2,000 input + 700 output tokens = **NZD $0.030 per inspection**

| Activity | Cost |
|---|---|
| 100 tickets/mo (50% with photos, all with briefs) | **~$3/mo** |
| 1,000 tickets/mo + 100 inspections | **~$36/mo** |
| 10,000 tickets/mo + 1,000 inspections | **~$330/mo** |

### Resend (email)
| Tier | Volume | Cost |
|---|---|---|
| Free | 3,000 emails/mo, 100/day | $0 |
| Pro | 50,000 emails/mo | **NZD $33** |
| Scale | 100,000 emails/mo | **NZD $150** |

### Object storage (photos & evidence)
Roughly **50 MB per active property per year** (compliance photos + ticket photos + inspection photos). For 100 properties: ~5 GB/year.

| Provider | Cost per GB/month |
|---|---|
| AWS S3 (Sydney) | NZD ~$0.04 |
| Cloudflare R2 | NZD ~$0.025 (no egress) |

### Domain
- **.co.nz**: NZD ~$25/year ($2/mo)
- **.com**: NZD ~$20/year

## Recommended phased rollout

### Phase A — Beta (months 1–3, 0–10 customers)
**Option 2 — Railway + Vercel + Atlas M0**
- Total infra: **NZD ~$15/mo**
- Total inc. AI/email/domain: **NZD ~$25/mo**
- Goal: validate product, ship fast, iterate

### Phase B — Growth (months 4–12, 10–100 customers)
**Migrate to Option 3 — AWS App Runner + Atlas M10**
- Total infra: **NZD ~$200/mo**
- AI usage at 1k tickets/mo: **+$36/mo**
- Total: **NZD ~$240/mo**
- Goal: production stability, NZ data residency, AWS audit trail

### Phase C — Scale (year 2+, 100+ customers)
**Migrate to Option 4 — ECS Fargate + Atlas M20**
- Total infra: **NZD ~$565/mo**
- AI usage at 10k tickets/mo: **+$330/mo**
- Total: **NZD ~$900/mo**
- Goal: SOC 2 readiness, multi-AZ HA, sub-second response times

### Unit economics check
Even at Phase C, fixed infra cost per customer at 100 customers = **~$9/customer/month**. If you charge $50–150/property/month, infra is ~6–18% of revenue — sustainable margins.

## What you still need regardless of option

| Need | Provider | Cost |
|---|---|---|
| **Source control + CI/CD** | GitHub Actions (free tier 2,000 min/mo) | $0 |
| **Error tracking** | Sentry (free 5k events/mo) | $0 → $33/mo Pro |
| **Uptime monitoring** | Better Stack (free) / UptimeRobot | $0 → $20/mo |
| **Backups** | Built into Atlas | $0 |
| **Logs** | CloudWatch / Railway built-in | $0–15 |
| **DNS** | Route 53 / Cloudflare | $1–3 |
| **TLS certificates** | ACM / Let's Encrypt | $0 |


## Migration paths between options

| From | To | Effort | Downside |
|---|---|---|---|
| Option 1 → 2 | VPS → Railway/Vercel | 4 hours | DB migration via `mongodump` |
| Option 2 → 3 | Railway → App Runner | 1 day | Build ECR pipeline, set up CloudFront |
| Option 3 → 4 | App Runner → ECS | 2–3 days | VPC + ALB setup, ECS task definitions |

Dwelloro's codebase is **provider-agnostic** — switching between Option 2 / 3 / 4 only requires re-deploying the same Docker image. Atlas connection string, JWT secret, Anthropic key are the only env vars that travel between platforms.

## Recommendation

**Start with Option 2 (Railway + Vercel + Atlas M0)** for the first 3–6 months. It's $25/mo, you'll ship in a day, and you can revalidate the product without burning runway on infrastructure.

**Move to Option 3 (AWS App Runner)** when:
- You have 5+ paying customers and need NZ data residency story for sales
- You need real SLA / uptime guarantees
- Atlas M0 hits its 512 MB limit

**Move to Option 4 (ECS Fargate)** when:
- 50+ customers
- You're pursuing SOC 2 / ISO 27001 certification
- You need multi-AZ failover


## Next decisions you need to make

1. **Which option do you want to start with?** (1, 2, 3, or 4)
2. **Domain name** — do you have one already, or need help registering `dwelloro.co.nz` / `.com`?
3. **AWS account** — already set up, or starting fresh?
4. **MongoDB Atlas account** — created, or need help?
5. **Anthropic key** — purchased, or planning to wait until launch?
6. **CI/CD** — should we set up GitHub Actions to auto-deploy on push?
