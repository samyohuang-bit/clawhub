# OpenClaw ↔ ClawHub Integration Map

## How They Connect

OpenClaw CLI has **native** ClawHub integration built in. The ClawHub website is the frontend/registry that serves the API.

### CLI Commands → API Endpoints

| OpenClaw Command | API Endpoint | Method |
|------------------|-------------|--------|
| `openclaw skills search "query"` | `/api/v1/search?q=query` | GET |
| `openclaw skills install <slug>` | `/api/v1/skills/{slug}` → `/api/v1/packages/{name}/download` | GET |
| `openclaw skills update --all` | `/api/v1/packages/{name}/versions/{version}` | GET |
| `openclaw plugins install clawhub:<pkg>` | `/api/v1/packages/{name}/download` | GET |
| `clawhub publish <path>` | (clawhub CLI — separate auth flow) | POST |
| `clawhub search "query"` | `/api/v1/search?q=query` | GET |

### Configuration

| Env Var | Purpose | Default |
|---------|---------|---------|
| `OPENCLAW_CLAWHUB_URL` | Override registry URL | `https://clawhub.ai` |
| `CLAWHUB_URL` | Alternative override | `https://clawhub.ai` |
| `OPENCLAW_CLAWHUB_TOKEN` | Auth token | (from config file) |
| `CLAWHUB_TOKEN` | Alternative token | (from config file) |
| `CLAWHUB_CONFIG_PATH` | Config file path | `~/.config/clawhub/config.json` |

### Auth Token Resolution Order
1. `OPENCLAW_CLAWHUB_TOKEN` env var
2. `CLAWHUB_TOKEN` env var
3. `CLAWHUB_AUTH_TOKEN` env var
4. Config file at `~/.config/clawhub/config.json` (or macOS `~/Library/Application Support/clawhub/config.json`)
5. Config file at `$XDG_CONFIG_HOME/clawhub/config.json`

## Actual API Endpoints (from openclaw source)

```
GET  /api/v1/search?q=<query>&limit=<n>
GET  /api/v1/skills/<slug>
GET  /api/v1/packages/<name>
GET  /api/v1/packages/<name>/versions/<version>
GET  /api/v1/packages/<name>/download
GET  /api/v1/download?name=<name>&version=<version>
```

## ClawHub Website API Routes — Needs Alignment

The ClawHub scaffold at `/Users/apple/clawhub/app/api/` currently uses:
```
/api/search     → should be /api/v1/search
/api/skills     → should be /api/v1/packages or /api/v1/skills
/api/auth       → OK (separate from registry API)
/api/moderation → OK (separate from registry API)
```

## What Needs to Happen

1. **ClawHub website** serves both:
   - The frontend UI (Next.js pages)
   - The registry API (`/api/v1/*` endpoints)

2. **OpenClaw CLI** talks to the registry API for search/install/update

3. **clawhub CLI** talks to the registry API for publish/sync/auth

4. **Billing API** (`/api/billing/*`) is a separate layer that the ClawHub website adds on top

## Architecture

```
                    ┌──────────────────┐
                    │  OpenClaw CLI    │
                    │  (skills search  │
                    │   install update)│
                    └────────┬─────────┘
                             │ /api/v1/*
                             ▼
┌──────────────┐    ┌──────────────────┐    ┌──────────────┐
│ clawhub CLI  │───▶│  ClawHub Website │◀───│  Browser UI  │
│ (publish,    │    │  (Next.js)       │    │  (search,    │
│  sync, auth) │    │                  │    │   browse,    │
└──────────────┘    │  ├─ /api/v1/*    │    │   publish)   │
                    │  ├─ /api/billing │    └──────────────┘
                    │  └─ pages/*      │
                    └────────┬─────────┘
                             │
                    ┌────────┴─────────┐
                    │  PostgreSQL      │
                    │  + S3 storage    │
                    │  + pgvector      │
                    └──────────────────┘
```

## Source Code References

- OpenClaw ClawHub client: `/opt/homebrew/lib/node_modules/openclaw/dist/clawhub-CFvPS51z.js`
- OpenClaw skills docs: `/opt/homebrew/lib/node_modules/openclaw/docs/tools/clawhub.md`
- ClawHub website scaffold: `/Users/apple/clawhub/`
