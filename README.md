# ClawHub — Open Source Agent Marketplace

The public registry for [OpenClaw](https://docs.openclaw.ai) skills and plugins.

Browse, discover, install, and publish AI agent skills. This is the open-source frontend and API for [clawhub.ai](https://clawhub.ai).

## Features

- 🔍 **Semantic Search** — pgvector-powered search by natural language description
- 📦 **Versioned Packages** — Semver with changelogs, rollbacks, and audit trails
- ⭐ **Stars & Community** — Quality ranking via stars, downloads, and usage signals
- 🛡️ **Moderation** — Report abuse, auto-hide after 3+ reports, moderator tools
- 💳 **Metered Billing** — Pay-per-use with credit packs and plan subscriptions
- 🔐 **GitHub OAuth** — Secure authentication with CLI API token generation
- 🌐 **OpenClaw Compatible** — Native `openclaw skills search/install/update` support

## Quick Start

```bash
npm install
cp .env.example .env.local
npm run dev
# → http://localhost:3000
```

## API Endpoints (22)

| Category | Endpoints | Description |
|----------|-----------|-------------|
| Auth | 4 | GitHub OAuth, JWT sessions, CLI tokens |
| Registry v1 | 7 | Search, skills CRUD, packages, downloads |
| Billing | 6 | Usage metering, plans, Stripe checkout, webhooks |
| Moderation | 3 | Reports, queue, actions |
| System | 1 | Health check |

Full API reference: [clawhub.ai/docs](https://clawhub.ai/docs) or [`docs/API.md`](docs/API.md)

## OpenClaw CLI Integration

ClawHub is the default registry for OpenClaw. These commands work out of the box:

```bash
openclaw skills search "calendar"     # → GET /api/v1/search
openclaw skills install my-skill      # → GET /api/v1/skills/:slug
openclaw skills update --all          # → version check + download
openclaw plugins install clawhub:pkg  # → GET /api/v1/packages/:name/download
```

Configure with `OPENCLAW_CLAWHUB_URL` env var (default: `https://clawhub.ai`).

## Architecture

```
clawhub/
├── app/
│   ├── page.tsx                 # Landing page
│   ├── search/                  # Search & browse
│   ├── skill/[slug]/            # Skill detail
│   ├── billing/                 # Billing dashboard
│   ├── docs/                    # API documentation
│   └── api/
│       ├── auth/                # GitHub OAuth flow
│       ├── v1/                  # Registry API (OpenClaw compatible)
│       ├── billing/             # Usage, plans, Stripe
│       └── moderation/          # Reports & actions
├── lib/
│   ├── db.ts                    # PostgreSQL client
│   ├── search.ts                # Vector + full-text search
│   ├── auth.ts                  # OAuth & JWT helpers
│   ├── billing.ts               # Usage metering & quotas
│   └── stripe.ts                # Stripe checkout & webhooks
├── db/migrations/               # PostgreSQL schema
├── docs/                        # Architecture docs
└── .github/workflows/           # CI/CD pipeline
```

## Billing

| Plan | Price | Calls/mo | Overage |
|------|-------|----------|---------|
| Free | $0 | 100 | Hard limit |
| Pro | $29 | 5,000 | $0.008/call |
| Team | $99 | 25,000 | $0.006/call |

Credit packs: Starter ($10/1.5K), Power ($45/8K), Ultimate ($150/30K)

Author revenue share: 85% to author, 15% platform fee.

## Tech Stack

- **Framework:** Next.js 15 (App Router), React 19, TypeScript
- **Database:** PostgreSQL + pgvector for semantic search
- **Auth:** GitHub OAuth + JWT (jose)
- **Payments:** Stripe (checkout, subscriptions, webhooks)
- **Styling:** Tailwind CSS v4
- **CI/CD:** GitHub Actions + Vercel

## Development

```bash
npm install          # Install dependencies
npm run dev          # Dev server (localhost:3000)
npm run build        # Production build
npm run lint         # ESLint
npm test             # Vitest
```

### Database Setup

```bash
# Create database
createdb clawhub

# Run migrations
psql clawhub -f db/migrations/001_initial_schema.sql
psql clawhub -f db/migrations/002_billing.sql
```

### Environment Variables

See [`.env.example`](.env.example) for all required variables:

- `DATABASE_URL` — PostgreSQL connection string
- `GITHUB_CLIENT_ID` / `GITHUB_CLIENT_SECRET` — GitHub OAuth
- `JWT_SECRET` — JWT signing key
- `OPENAI_API_KEY` — For vector embeddings (search)
- `STRIPE_SECRET_KEY` — Stripe payments
- `STRIPE_WEBHOOK_SECRET` — Stripe webhook verification

## Documentation

- [API Reference](docs/API.md) — All 22 endpoints with examples
- [Contributing Guide](docs/CONTRIBUTING.md) — Development setup and PR process
- [Billing Architecture](docs/BILLING-ARCHITECTURE.md) — Metered billing design
- [Billing Dashboard](docs/BILLING-DASHBOARD.md) — UI/UX specifications
- [OpenClaw Integration](docs/OPENCLAW-INTEGRATION.md) — CLI ↔ API mapping

## License

MIT
