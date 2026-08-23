# Sasyashri (सस्यश्री) — Agricultural Wholesale Digital Platform

> **The Goddess of Prosperous Harvest** — A production-grade, multi-role digital ecosystem connecting India's agricultural supply chain.

[![CI/CD](https://github.com/your-org/sasyashri/actions/workflows/ci.yml/badge.svg)](https://github.com/your-org/sasyashri/actions/workflows/ci.yml)
[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Node](https://img.shields.io/badge/node-%3E%3D20-green.svg)](https://nodejs.org)

## Overview

Sasyashri is a unified digital platform for wholesale agricultural trade in India. It brings together **8 role-based portals** under a single URL with role-based access control:

| Portal | Users | Key Features |
|--------|-------|--------------|
| **Buyer** | Wholesale buyers, retailers, restaurants | Fixed-price & custom deals, escrow payments, quality assurance |
| **Seller** | Traders, wholesalers, aggregators | Anonymous selling, OCR stock entry, ERP, AI assistant, tax filing |
| **Farmer** | Crop growers | Land management, cost tracking, loans, gig labor, machinery booking, AI agri-advisor |
| **Financier** | Investors, banks, NBFCs | Investment marketplace, risk AI, auto-repayments |
| **Sales Agent** | Independent middlemen | Buyer representation, quality checks, delivery coordination |
| **Transporter** | Vehicle/machinery owners | Load bidding, transport orders, machinery rentals |
| **Job Portal** | Job seekers & posters | Multi-role job board, platform chat |
| **Quality Lab** | FSSAI-accredited labs | Testing services, digital certificates |

## Tech Stack

| Layer | Technology |
|-------|------------|
| **Frontend** | Next.js 14 (App Router), React 18, TypeScript, Tailwind CSS, Radix UI |
| **Backend** | NestJS, TypeScript, Prisma ORM, PostgreSQL 16, Redis 7 |
| **Real-time** | LiveKit (WebRTC), Socket.io |
| **AI/Voice** | NVIDIA Riva/NIM (streaming ASR + TTS + LLM) |
| **Payments** | RazorpayX / Cashfree (nodal/escrow) |
| **OCR** | Tesseract + LayoutLM (invoice scanning) |
| **GST** | GSP-certified APIs (MasterGST/ClearTax) |
| **Infrastructure** | Docker, Docker Compose, Nginx, Prometheus, Grafana |
| **CI/CD** | GitHub Actions (self-hosted runner on WSL) |
| **Hosting** | DuckDNS (dev) → VPS (Hetzner/Contabo) → AWS (scale) |

## Quick Start

### Prerequisites
- Node.js 20+
- pnpm 9+ (`corepack enable && corepack prepare pnpm@latest --activate`)
- Docker & Docker Compose
- PostgreSQL 16 + Redis 7 (or use Docker Compose)

### Development Setup

```bash
# Clone repository
git clone https://github.com/your-org/sasyashri.git
cd sasyashri

# Install dependencies
pnpm install

# Configure environment
cp .env.example .env.local
# Edit .env.local with your values

# Start infrastructure (PostgreSQL, Redis, MinIO, LiveKit)
pnpm docker:dev

# Generate Prisma client & run migrations
pnpm db:generate
pnpm db:migrate:dev

# Seed database (optional)
pnpm db:seed

# Start development servers
pnpm dev
```

### Access Points
- **Web App:** https://localhost:3000
- **API:** https://localhost:4000
- **LiveKit:** ws://localhost:7880
- **MinIO Console:** http://localhost:9001
- **Prisma Studio:** `pnpm db:studio`
- **Grafana (monitoring):** http://localhost:3001 (run `docker compose --profile monitoring up -d`)

## Project Structure

```
sasyashri/
├── apps/
│   ├── web/          # Next.js PWA (all portals)
│   ├── api/          # NestJS backend
│   └── admin/        # Admin panel
├── packages/
│   ├── ui/           # Shared React components
│   ├── config/       # Shared configs (TS, ESLint, Tailwind)
│   ├── database/     # Prisma schema & client
│   ├── auth/         # Auth utilities, WebAuthn
│   ├── ai/           # NVIDIA Riva/NIM clients
│   ├── payments/     # Payment abstractions
│   ├── webrtc/       # LiveKit helpers
│   └── ocr/          # Invoice OCR pipeline
├── infra/
│   ├── docker/       # Docker Compose & Dockerfiles
│   ├── nginx/        # Reverse proxy configs
│   ├── monitoring/   # Prometheus/Grafana
│   └── scripts/      # Deployment scripts
├── docs/
│   ├── architecture/ # ADRs, diagrams
│   ├── api/          # OpenAPI specs
│   └── business/     # Blueprint, PRDs
└── .github/workflows # CI/CD pipelines
```

## Key Features

### 🛒 Dual Purchase Model
- **Fixed-Rate (Option 1):** Platform-set prices, seller anonymous, 1% prepaid discount, COD security deposit
- **Custom Deal (Option 2):** Anonymous seller list, paid contact reveal (50/50 split on rejection), 1% platform commission on success

### 🔐 Security-First Seller Portal
- 2FA (OTP) mandatory
- WebAuthn passkeys (fingerprint/face)
- Device registration & trust
- End-to-end encryption for financial data

### 🤖 AI Voice & Chat Agents
- Zero-latency streaming (NVIDIA Riva)
- Per-seller/farmer private knowledge base (RAG)
- Hindi/English support
- Configurable personality, boundaries, working hours

### 📄 Intelligent Invoice OCR
- Scan purchase invoices → auto-extract line items → one-tap stock entry
- Supplier GSTIN, prices, quantities captured automatically

### 💰 Complete Business Management (Seller)
- Stock, sales, income/expense, loans, payroll, tax
- Direct GSTR-1/GSTR-3B filing via GSP APIs
- Real-time AI business insights

### 🚜 Farmer Ecosystem
- Land records (owned/rented) with survey numbers
- Crop-cycle cost tracking & profit analysis
- Loan tracking (KCC, bank, private) with interest
- Gig labor marketplace & machinery booking

### 📦 PWA Experience
- Installable on Android (Chrome) & iOS (Safari "Add to Home Screen")
- Offline caching for orders & catalog
- Push notifications (Web Push + SMS fallback)

## Environment Variables

See [.env.example](.env.example) for all required variables. Key secrets:

```bash
# Generate secure secrets
openssl rand -base64 48  # For JWT_SECRET, JWT_REFRESH_SECRET
openssl rand -base64 32  # For LIVEKIT_API_SECRET
```

## Database Schema

The Prisma schema (`packages/database/prisma/schema.prisma`) includes:
- 50+ models covering all portals
- Enums for all domain types
- Proper indexes for query performance
- Audit logging for compliance

## API Documentation

- REST endpoints: `/api/*`
- GraphQL playground: `/api/graphql` (when enabled)
- OpenAPI spec: `docs/api/openapi.yaml`

## Testing

```bash
# Unit tests
pnpm test:unit

# API contract tests
pnpm test:api

# E2E tests (Playwright)
pnpm test:e2e

# All tests
pnpm test
```

## Deployment

### Development (WSL + DuckDNS)
```bash
# Start all services
docker compose -f infra/docker/docker-compose.yml up -d

# Access via https://localhost:3000 (mkcert) or http://localhost:3000
```

### Staging/Production (VPS)
```bash
# On VPS (Hetzner CX22 ~€4/mo or Contabo ~$4/mo)
# 1. Clone repo, create .env.prod
# 2. Run with production compose file
docker compose -f infra/docker/docker-compose.prod.yml up -d

# 3. Configure Nginx + Let's Encrypt (Certbot)
# 4. Point DuckDNS A record to VPS IP
```

### Zero-Cost CI/CD
- Self-hosted GitHub Actions runner on WSL
- Docker layer caching via GitHub Actions cache
- Free Docker Hub for image storage
- DuckDNS for free subdomain + Let's Encrypt SSL

## Business Rules (Enforced in Code)

1. **Wholesale Only** — All products require MOQ, unit, unit_quantity
2. **Seller Anonymity** — Never expose seller identity in buyer APIs
3. **Fixed Price Source** — Platform pricing table only (admin-controlled)
4. **COD Security Deposit** — Delivery cost + 1% product cost
5. **Prepaid Discount** — 1% borne by platform margin
6. **Contact Fee Split** — 50/50 platform/seller on rejection/off-platform
7. **Custom Deal Commission** — 1% deducted from seller payout
8. **Paid Calls** — Seller sets rate, buyer charged on answer, refund if terms unfulfilled
9. **AI Calls** — Free for buyers
10. **Return Window** — Default 7 days, configurable (perishables: 24-48h)

## Compliance

- **FSSAI** — Mandatory for food sellers & labs
- **GST** — GSP integration for direct filing, e-Invoice, e-Way Bill
- **DPDP Act 2023** — Data privacy for KYC, call recordings, business data
- **RBI** — Nodal/escrow via certified payment aggregators
- **Financier Portal** — Requires NBFC-P2P license (legal review needed)

## Contributing

1. Fork the repository
2. Create feature branch: `git checkout -b feature/amazing-feature`
3. Commit changes: `git commit -m 'feat: add amazing feature'`
4. Push to branch: `git push origin feature/amazing-feature`
5. Open Pull Request

### Commit Convention
Follow [Conventional Commits](https://www.conventionalcommits.org/):
```
feat(scope): description
fix(scope): description
docs(scope): description
```

## License

MIT License — see [LICENSE](LICENSE) for details.

## Support

- **Documentation:** `docs/`
- **Issues:** GitHub Issues
- **Discord:** [Join our community](https://discord.gg/sasyashri)

---

**Built with ❤️ for India's farmers and traders**

*सस्यश्री — The Wealth of Crops*