# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in the Sasyashri repository.

## Project Overview

**Sasyashri (सस्यश्री)** — Agricultural Wholesale Digital Platform  
A production-grade, multi-role digital ecosystem connecting farmers, wholesale buyers, sellers, independent sales agents, transporters, food quality labs, investors, and job seekers under one unified web address.

**Core Architecture:** 8 role-based portals on a single URL with role-based access control. Seller anonymity in fixed-rate transactions. Platform acts as guarantor for all on-platform transactions. AI-first assistance via NVIDIA Riva/NIM for zero-latency voice/chat.

---

## Technology Stack

### Frontend (PWA)
- **Framework:** Next.js 14+ (App Router) with React 18
- **Language:** TypeScript (strict mode)
- **Styling:** Tailwind CSS + Radix UI primitives
- **State:** Zustand for client state, TanStack Query for server state
- **PWA:** next-pwa with Workbox (service worker, manifest, offline caching)
- **i18n:** next-intl (Hindi + English, RTL-ready for future)

### Backend
- **Runtime:** Node.js 20+ (LTS)
- **Framework:** NestJS (modular, TypeScript-first, built-in DI, guards, pipes)
- **Database:** PostgreSQL 16 (primary), Redis 7 (caching, sessions, queues)
- **ORM:** Prisma (type-safe, migrations, seeding)
- **Auth:** JWT (access/refresh) + WebAuthn (passkeys) for sellers
- **API:** REST + GraphQL (Apollo) for complex queries
- **Real-time:** Socket.io (WebRTC signaling, chat, notifications)

### AI / Voice
- **Provider:** NVIDIA Riva / NIM microservices (streaming ASR + TTS + LLM)
- **Integration:** Custom NestJS module wrapping NVIDIA gRPC/REST endpoints
- **Per-user isolation:** Separate conversation contexts, RAG over seller/farmer data

### Infrastructure (Zero-Cost Dev → Low-Cost Prod)
| Layer | Development (WSL) | Staging/Prod (Initial) | Future Scale |
|-------|-------------------|------------------------|--------------|
| Compute | Local Docker Compose | DuckDNS + VPS (Hetzner/Contabo) | AWS ECS/Fargate |
| Database | PostgreSQL/Redis containers | Same VPS (Docker) | RDS + ElastiCache |
| Object Storage | Local MinIO | MinIO on VPS | S3 / Cloudflare R2 |
| CI/CD | GitHub Actions (self-hosted runner on WSL) | Same | GitHub Actions + AWS CodeDeploy |
| DNS | DuckDNS (free) | DuckDNS → Custom domain later | Route 53 |
| SSL | mkcert (local), Let's Encrypt (prod) | Let's Encrypt (Certbot) | ACM |
| Monitoring | Prometheus + Grafana (local) | Same on VPS | CloudWatch + Datadog |

### Open-Source Services (Self-Hosted)
- **WebRTC:** LiveKit (open-source, scalable, supports AI bot integration)
- **Chat:** Socket.io + custom rooms (or Matrix/Element if federation needed)
- **OCR:** Tesseract.js (client-side) + Tesseract server (Docker) for invoice scanning
- **GST/GSP:** Use sandbox APIs; production requires certified GSP (e.g., MasterGST, ClearTax) — integrate via HTTP
- **Payments:** RazorpayX / Cashfree marketplace APIs (nodal/escrow support)

---

## Repository Structure

```
sasyashri/
├── .github/
│   └── workflows/           # CI/CD pipelines
├── apps/
│   ├── web/                 # Next.js PWA (buyer, seller, all portals)
│   ├── api/                 # NestJS backend (monorepo)
│   └── admin/               # Admin panel (separate Next.js app or /admin route)
├── packages/
│   ├── ui/                  # Shared React component library
│   ├── config/              # Shared Tailwind, TypeScript, ESLint configs
│   ├── database/            # Prisma schema + migrations (shared)
│   ├── auth/                # Shared auth utilities, WebAuthn helpers
│   ├── ai/                  # NVIDIA Riva/NIM client wrappers
│   ├── payments/            # Payment gateway abstractions
│   ├── webrtc/              # LiveKit client/server helpers
│   └── ocr/                 # Invoice OCR pipeline
├── infra/
│   ├── docker/
│   │   ├── docker-compose.yml
│   │   ├── docker-compose.prod.yml
│   │   └── Dockerfile.*
│   ├── nginx/               # Reverse proxy configs
│   ├── monitoring/          # Prometheus, Grafana dashboards
│   └── scripts/             # Deployment, backup, seed scripts
├── docs/
│   ├── architecture/        # ADRs, system diagrams
│   ├── api/                 # OpenAPI specs
│   └── business/            # This blueprint + PRDs
├── .env.example
├── .env.local (gitignored)
├── turbo.json               # Turborepo config
├── package.json
├── pnpm-workspace.yaml
└── README.md
```

**Monorepo Tool:** Turborepo with pnpm workspaces

---

## Common Development Commands

### Initial Setup
```bash
# Install pnpm (if not installed)
corepack enable && corepack prepare pnpm@latest --activate

# Install dependencies
pnpm install

# Generate Prisma client
pnpm --filter=@sasyashri/database db:generate

# Run migrations (dev)
pnpm --filter=@sasyashri/database db:migrate:dev

# Seed database
pnpm --filter=@sasyashri/database db:seed
```

### Development (WSL + Docker)
```bash
# Start all services (PostgreSQL, Redis, MinIO, LiveKit, API, Web)
docker compose -f infra/docker/docker-compose.yml up -d

# View logs
docker compose -f infra/docker/docker-compose.yml logs -f api
docker compose -f infra/docker/docker-compose.yml logs -f web

# Run dev servers with hot reload (outside Docker for faster iteration)
pnpm dev          # Runs both web and api via Turborepo
pnpm dev:web      # Next.js only (port 3000)
pnpm dev:api      # NestJS only (port 4000)

# Run tests
pnpm test              # All tests
pnpm test:unit         # Unit tests only
pnpm test:e2e          # Playwright E2E tests
pnpm test:api          # API contract tests

# Type checking
pnpm typecheck

# Linting
pnpm lint
pnpm lint:fix
```

### Database Commands
```bash
# Prisma Studio (visual DB browser)
pnpm --filter=@sasyashri/database db:studio

# Create migration
pnpm --filter=@sasyashri/database db:migrate:dev --name <migration_name>

# Reset database (dev only)
pnpm --filter=@sasyashri/database db:migrate:reset

# Push schema changes without migration (prototyping)
pnpm --filter=@sasyashri/database db:push
```

### Building
```bash
# Build all apps
pnpm build

# Build specific app
pnpm --filter=@sasyashri/web build
pnpm --filter=@sasyashri/api build

# Build Docker images
docker compose -f infra/docker/docker-compose.prod.yml build
```

---

## Key Architectural Decisions

### 1. Single URL, Role-Based Portals
- **Middleware** (Next.js) reads JWT role claim → rewrites to portal layout
- All portals share `/app/(portals)/[role]/...` route group
- Seller portal: `/seller/*`, Farmer: `/farmer/*`, etc.
- Admin: `/admin/*` (separate middleware, stricter auth)

### 2. Seller Anonymity (Fixed-Rate)
- Products table has `seller_id` (FK) but **never exposed** in buyer-facing APIs
- Fixed-rate price stored in `platform_pricing` table (set by admin/data analyst)
- Buyer sees: `product.name`, `platform_price`, `unit`, `moq` — no seller info
- Custom deal: separate `custom_deals` table with `seller_id` hidden until contact fee paid

### 3. Escrow Payment Flow
```
Buyer pays → RazorpayX/Cashfree nodal account (escrow)
    ↓
Seller dispatches → Updates order status → Proof of delivery (OTP/QR)
    ↓
Platform verifies → Releases funds to seller (minus 1% commission)
    ↓
Refund/Return: Buyer raises dispute → Platform mediates → Refund to buyer / Release to seller
```

### 4. Contact Fee Logic (Custom Deals)
```typescript
// On contact fee payment
if (deal.accepted && deal.onPlatform) {
  buyer.refund(contactFee);
  platform.chargeCommission(orderValue * 0.01);
} else if (!deal.accepted || deal.offPlatform) {
  seller.credit(contactFee * 0.5);
  platform.revenue(contactFee * 0.5);
}
```

### 5. AI Voice/Chat Architecture
```
Client (WebRTC) → LiveKit SFU → NVIDIA Riva (ASR) → LLM (RAG) → NVIDIA Riva (TTS) → LiveKit → Client
                    ↑
              Seller/Farmer config (voice, language, knowledge base)
```
- Each seller/farmer has isolated vector DB (pgvector) for their business data
- AI agent configured via seller portal: voice, tone, boundaries, working hours

### 6. Invoice OCR Pipeline
```
Seller uploads PDF/image → Queue (BullMQ/Redis) → Worker (Tesseract + LayoutLM) 
    → Extracted line items → Draft StockEntry created → Seller reviews/approves → Committed
```

---

## Environment Variables

### Required (.env.local)
```env
# Database
DATABASE_URL="postgresql://user:pass@localhost:5432/sasyashri?schema=public"
REDIS_URL="redis://localhost:6379"

# Auth
JWT_SECRET="<64-char-random>"
JWT_REFRESH_SECRET="<64-char-random>"
WEB_AUTHN_RP_ID="localhost"
WEB_AUTHN_ORIGIN="https://localhost:3000"

# NVIDIA AI
NVIDIA_RIVA_API_KEY="<from-founder>"
NVIDIA_RIVA_ENDPOINT="grpc://localhost:50051"  # or cloud endpoint
NVIDIA_NIM_ENDPOINT="https://integrate.api.nvidia.com/v1"

# LiveKit (WebRTC)
LIVEKIT_API_KEY="<generated>"
LIVEKIT_API_SECRET="<generated>"
LIVEKIT_WS_URL="wss://localhost:7880"

# Payments (RazorpayX / Cashfree)
RAZORPAY_KEY_ID="<test-key>"
RAZORPAY_KEY_SECRET="<test-secret>"
RAZORPAY_WEBHOOK_SECRET="<webhook-secret>"

# GST/GSP (Sandbox)
GSP_CLIENT_ID="<sandbox>"
GSP_CLIENT_SECRET="<sandbox>"
GSP_API_URL="https://api-sandbox.mastergst.com"

# Email/SMS (optional for dev)
SMTP_HOST="localhost"
SMTP_PORT="1025"
TWILIO_ACCOUNT_SID=""
TWILIO_AUTH_TOKEN=""

# App
NEXT_PUBLIC_APP_URL="https://localhost:3000"
NEXT_PUBLIC_API_URL="https://localhost:4000"
```

---

## Testing Strategy

| Layer | Tool | Coverage Target |
|-------|------|-----------------|
| Unit (logic, utils) | Vitest | 80%+ |
| API Contract | Pact / Supertest | All public endpoints |
| Integration | Testcontainers (PostgreSQL, Redis) | Critical flows |
| E2E | Playwright | Happy paths + payment flows |
| Visual | Playwright + Percy (optional) | Key pages |
| Load | k6 (CI nightly) | 1000 concurrent users |

### Running Tests
```bash
# Unit tests (watch mode)
pnpm test:unit --watch

# E2E tests (headed for debugging)
pnpm test:e2e --headed

# API contract tests
pnpm test:api

# Coverage report
pnpm test:coverage
```

---

## Git Workflow

### Branching
- `main` — production-ready, protected
- `develop` — integration branch
- `feature/*` — feature branches from `develop`
- `fix/*` — bug fixes from `develop` or `main`
- `release/*` — release preparation

### Commit Convention (Conventional Commits)
```
<type>(<scope>): <subject>

<body>

<footer>
```
Types: `feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`, `chore`, `build`, `ci`

### PR Requirements
- All CI checks pass (typecheck, lint, unit, integration, e2e)
- Coverage ≥ 80% on changed files
- No `any` types in new code
- ADR for architectural changes

---

## Portals & Role Matrix

| Portal | Route Prefix | Auth Level | Key Features |
|--------|--------------|------------|--------------|
| Buyer | `/buyer` | Password (+ optional OTP) | Bazaar, Thaila, Kharid, Custom Deals, Calls |
| Seller | `/seller` | **2FA + WebAuthn + Device Reg** | Stock (OCR), ERP, Tax, AI Assistant, Call Terms |
| Farmer | `/farmer` | Password + 2FA opt | Land, Cost Tracking, Loans, Gig, Machinery, AI Agri |
| Financier | `/financier` | Password + 2FA opt | Investment Marketplace, Risk AI, Repayments |
| Sales Agent | `/agent` | Password | Buyer Tasks, Platform Gigs, Quality Checks |
| Transporter | `/transporter` | Password | Vehicle/Machinery Listing, Order Bidding |
| Job Portal | `/jobs` | Password (all roles) | Post/Apply, Filters, Platform Chat |
| Quality Lab | `/lab` | Password + Admin Verify | Service Listing, Testing Requests, Certificates |
| Admin | `/admin` | **Max (separate panel)** | Pricing, Fees, Commissions, Disputes, Users |

---

## Important Business Rules (Enforced in Code)

1. **Wholesale Only:** All products require `unit`, `unit_quantity`, `moq` — no retail
2. **Seller Anonymity:** Never expose `seller_id`, `seller_name`, `seller_contact` in buyer APIs
3. **Fixed Price Source:** `platform_pricing` table only — seller's `expected_price` is internal
4. **COD Security Deposit:** `delivery_cost + (product_cost * 0.01)` — auto-adjusted on delivery
5. **Prepaid Discount:** 1% off `platform_price` — borne by platform margin
6. **Contact Fee Split:** 50/50 platform/seller on rejection/off-platform; 100% refund to buyer on success
7. **Custom Deal Commission:** 1% of `order_value` deducted from seller payout
8. **Paid Calls:** Seller sets rate; buyer auto-charged on answer; refund if terms unfulfilled
9. **AI Calls:** Free for buyers; seller/farmer configures agent personality/knowledge
9. **Return Window:** Default 7 days; configurable per seller/product (perishable: 24-48h)

---

## DevOps Setup Guide (WSL + GitHub + DuckDNS)

### 1. WSL2 Environment Setup
```bash
# In WSL (Ubuntu 22.04+)
sudo apt update && sudo apt install -y \
  docker.io docker-compose-plugin \
  nodejs npm postgresql-client redis-tools \
  certbot nginx git gh

# Configure Docker for non-root
sudo usermod -aG docker $USER
newgrp docker

# Install pnpm
corepack enable && corepack prepare pnpm@latest --activate

# Install Turborepo globally
pnpm add -g turbo

# Verify
docker --version && node --version && pnpm --version
```

### 2. GitHub Repository Setup
```bash
# Create repo on GitHub (private)
gh repo create sasyashri --private --source=. --push

# Add repository secrets (GitHub UI or CLI)
gh secret set DATABASE_URL --body "postgresql://..."
gh secret set JWT_SECRET --body "<64-char>"
gh secret set NVIDIA_RIVA_API_KEY --body "<key>"
gh secret set RAZORPAY_KEY_ID --body "<key>"
gh secret set RAZORPAY_KEY_SECRET --body "<secret>"
gh secret set LIVEKIT_API_KEY --body "<key>"
gh secret set LIVEKIT_API_SECRET --body "<secret>"
gh secret set GSP_CLIENT_ID --body "<id>"
gh secret set GSP_CLIENT_SECRET --body "<secret>"
gh secret set DOCKER_HUB_USERNAME --body "<username>"
gh secret set DOCKER_HUB_TOKEN --body "<token>"
```

### 3. Self-Hosted GitHub Actions Runner (on WSL)
```bash
# Creates a runner that uses your WSL machine for CI (free, no GitHub minutes)
mkdir -p ~/actions-runner && cd ~/actions-runner
curl -o actions-runner-linux-x64-2.317.0.tar.gz -L \
  https://github.com/actions/runner/releases/download/v2.317.0/actions-runner-linux-x64-2.317.0.tar.gz
tar xzf actions-runner-linux-x64-2.317.0.tar.gz

# Configure (run once, follow prompts)
./config.sh --url https://github.com/<your-username>/sasyashri --token <runner-token>

# Run as service (or manually: ./run.sh)
sudo ./svc.sh install
sudo ./svc.sh start
```

**`.github/workflows/ci.yml`** uses `runs-on: self-hosted` for zero-cost CI.

### 4. Local Development with Docker Compose
**`infra/docker/docker-compose.yml`** — key services:
```yaml
services:
  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_DB: sasyashri
      POSTGRES_USER: sasyashri
      POSTGRES_PASSWORD: ${DB_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data
    ports: ["5432:5432"]
    healthcheck: ["CMD-SHELL", "pg_isready -U sasyashri"]

  redis:
    image: redis:7-alpine
    command: redis-server --appendonly yes
    volumes: [redis_data:/data]
    ports: ["6379:6379"]

  minio:
    image: minio/minio:latest
    command: server /data --console-address ":9001"
    environment:
      MINIO_ROOT_USER: ${MINIO_ROOT_USER}
      MINIO_ROOT_PASSWORD: ${MINIO_ROOT_PASSWORD}
    ports: ["9000:9000", "9001:9001"]
    volumes: [minio_data:/data]

  livekit:
    image: livekit/livekit-server:latest
    command: ["--dev", "--bind", "0.0.0.0"]
    ports: ["7880:7880", "7881:7881"]
    environment:
      LIVEKIT_KEYS: ${LIVEKIT_API_KEY}:${LIVEKIT_API_SECRET}

  api:
    build:
      context: ../..
      dockerfile: infra/docker/Dockerfile.api
    depends_on: [postgres, redis, livekit]
    environment:
      - DATABASE_URL=postgresql://sasyashri:${DB_PASSWORD}@postgres:5432/sasyashri
      - REDIS_URL=redis://redis:6379
      - LIVEKIT_WS_URL=ws://livekit:7880
    ports: ["4000:4000"]
    volumes:
      - ../../apps/api:/app
      - /app/node_modules

  web:
    build:
      context: ../..
      dockerfile: infra/docker/Dockerfile.web
    depends_on: [api]
    environment:
      - NEXT_PUBLIC_API_URL=http://api:4000
    ports: ["3000:3000"]
    volumes:
      - ../../apps/web:/app
      - /app/node_modules
      - /app/.next

volumes:
  postgres_data:
  redis_data:
  minio_data:
```

### 5. DuckDNS + HTTPS Setup (Production VPS)
```bash
# On your VPS (Hetzner CX22 ~€4/mo or Contabo ~$4/mo)
# 1. Register at duckdns.org → get subdomain (e.g., sasyashri.duckdns.org)
# 2. Point A record to VPS IP

# 3. Install Docker + Docker Compose on VPS
# 4. Clone repo, create .env.prod with production values

# 5. Nginx reverse proxy + Let's Encrypt
# /etc/nginx/sites-available/sasyashri
server {
    listen 80;
    server_name sasyashri.duckdns.org;
    location / { proxy_pass http://localhost:3000; }
    location /api { proxy_pass http://localhost:4000; }
    location /livekit { proxy_pass http://localhost:7880; }
}

# 6. Certbot
sudo certbot --nginx -d sasyashri.duckdns.org

# 7. Auto-renewal
sudo systemctl enable certbot.timer
```

### 6. GitHub Actions CI/CD (Zero Cost)
```yaml
# .github/workflows/ci.yml
name: CI
on: [push, pull_request]
jobs:
  test:
    runs-on: self-hosted  # Uses your WSL runner
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v3
      - uses: actions/setup-node@v4
        with: { node-version: 20, cache: 'pnpm' }
      - run: pnpm install --frozen-lockfile
      - run: pnpm typecheck
      - run: pnpm lint
      - run: pnpm test:unit
      - run: pnpm test:api
  
  e2e:
    runs-on: self-hosted
    needs: test
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v3
      - run: pnpm install --frozen-lockfile
      - run: pnpm build
      - run: docker compose -f infra/docker/docker-compose.yml up -d
      - run: sleep 30 && pnpm test:e2e
      - run: docker compose -f infra/docker/docker-compose.yml down

  build:
    runs-on: self-hosted
    needs: [test, e2e]
    if: github.ref == 'refs/heads/main'
    steps:
      - uses: actions/checkout@v4
      - uses: docker/login-action@v3
        with: { username: ${{ secrets.DOCKER_HUB_USERNAME }}, password: ${{ secrets.DOCKER_HUB_TOKEN }} }
      - run: docker compose -f infra/docker/docker-compose.prod.yml build
      - run: docker compose -f infra/docker/docker-compose.prod.yml push
```

### 7. Deploy to VPS (Manual → Automated)
```bash
# On VPS (after CI pushes images to Docker Hub)
docker compose -f infra/docker/docker-compose.prod.yml pull
docker compose -f infra/docker/docker-compose.prod.yml up -d --remove-orphans

# Run migrations
docker compose -f infra/docker/docker-compose.prod.yml exec api pnpm db:migrate:deploy
```

### 8. Monitoring (Local + VPS)
```bash
# Prometheus + Grafana (in docker-compose.monitoring.yml)
# Dashboards: API latency, DB connections, Queue depth, AI response time, Order volume
# Alerts: Discord/Slack webhook for critical errors
```

---

## Cost Optimization Checklist

- [ ] **Zero Dev Cost:** WSL + self-hosted runner + local Docker = $0
- [ ] **DuckDNS:** Free subdomain + Let's Encrypt SSL = $0
- [ ] **VPS:** Hetzner CX22 (€4.15/mo) or Contabo VPS S ($4/mo) — covers API, DB, Redis, LiveKit, MinIO
- [ ] **NVIDIA AI:** Use free tier / credits initially; optimize token usage
- [ ] **Payments:** RazorpayX/Cashfree — pay per transaction, no monthly fees
- [ ] **GSP:** Pay per return filing (~₹10-50/return) — only in production
- [ ] **SMS/Email:** Use free tiers (Twilio trial, SendGrid free 100/day)
- [ ] **Monitoring:** Self-hosted Prometheus/Grafana = $0

---

## Next Steps for Development

1. **Initialize Monorepo:**
   ```bash
   cd /home/ML/Sasyashri
   pnpm init -w
   # Add turbo.json, pnpm-workspace.yaml, package.json
   ```

2. **Create Apps:**
   ```bash
   mkdir -p apps/web apps/api packages/{ui,config,database,auth,ai,payments,webrtc,ocr}
   ```

3. **Set up Next.js (web) + NestJS (api) with shared Prisma schema**

4. **Implement Auth Module** (JWT + WebAuthn) — shared package

5. **Build Bazaar Catalog** (products, categories, pricing)

6. **Implement Buyer Portal** (fixed-price + custom deal flows)

7. **Implement Seller Portal** (stock OCR, ERP, AI assistant)

8. **Integrate LiveKit + NVIDIA Riva** for voice calls

9. **Payment Integration** (RazorpayX escrow)

10. **PWA Configuration** + DuckDNS deployment

---

## References

- **Business Blueprint:** `docs/business/Sasyashri-Master-Blueprint.md`
- **API Specs:** `docs/api/openapi.yaml` (to be generated)
- **Architecture Decisions:** `docs/architecture/ADR-*.md`
- **NVIDIA Riva Docs:** https://docs.nvidia.com/deeplearning/riva/user-guide/docs/
- **LiveKit Docs:** https://docs.livekit.io/
- **RazorpayX Marketplace:** https://razorpay.com/docs/payments/payouts/marketplaces/
- **GSP Integration:** https://www.mastergst.com/developer/api
- **PWA Checklist:** https://web.dev/progressive-web-apps-checklist/