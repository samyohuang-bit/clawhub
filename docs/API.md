# ClawHub API Reference

Base URL: `https://clawhub.ai`

## Authentication

All write endpoints require authentication. Include a JWT token in the `Authorization` header or use the auth cookie.

```
Authorization: Bearer <token>
```

### Auth Flow

1. `GET /api/auth/login` → Redirect to GitHub OAuth
2. GitHub redirects to `/api/auth/callback?code=...&state=...`
3. Callback creates/updates user, issues JWT cookie
4. Use cookie or `Authorization: Bearer <jwt>` for API calls
5. `POST /api/auth/me` → Generate CLI API token (`chub_` prefix)

---

## Registry v1 (OpenClaw Compatible)

These endpoints match what OpenClaw CLI expects.

### GET /api/v1/search

Semantic + full-text search for skills.

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| q | string | "" | Search query |
| tags | string | — | Comma-separated tags |
| page | int | 1 | Page number |
| limit | int | 20 | Results per page (max 100) |
| sort | string | relevance | relevance, stars, downloads, recent |

### GET /api/v1/skills

List skills (paginated).

### POST /api/v1/skills

Publish a new skill. Requires auth.

```json
{
  "slug": "my-skill",
  "name": "My Skill",
  "summary": "Short description",
  "description": "Full SKILL.md content",
  "tags": ["productivity"],
  "version": "1.0.0",
  "changelog": "Initial release",
  "files": [
    { "path": "SKILL.md", "content": "..." },
    { "path": "scripts/run.sh", "content": "..." }
  ]
}
```

Validation:
- `slug`: lowercase alphanumeric + hyphens, 2-50 chars
- `version`: semver format
- `files`: must include `SKILL.md`
- Account must be ≥1 week old

### GET /api/v1/skills/:slug

Get skill details with versions.

### POST/DELETE/GET /api/v1/skills/:slug/star

Star/unstar/check star status.

### GET /api/v1/packages/:name

Package detail (alias for skills).

### GET /api/v1/packages/:name/versions/:version

Specific version detail.

### GET /api/v1/packages/:name/download

Download package bundle.

---

## Billing

### GET /api/billing/balance

Account balance, plan info, current usage.

### POST /api/billing/usage

Record usage events (batched).

```json
{
  "events": [
    { "event_type": "agent_call", "quantity": 1, "unit": "calls", "skill_slug": "my-skill" },
    { "event_type": "token", "quantity": 1500, "unit": "tokens" }
  ]
}
```

Returns 429 if free tier quota exceeded.

### GET /api/billing/usage

Usage breakdown by skill.

### POST /api/billing/plan

Change plan.

```json
{ "plan": "pro" }
```

### POST /api/billing/checkout

Create Stripe checkout session.

```json
{ "type": "credits", "pack": "power" }
// or
{ "type": "subscription", "plan": "pro" }
```

### POST /api/billing/webhook

Stripe webhook handler (raw body required).

---

## Moderation

### POST /api/moderation/report

Report a skill (auth required).

```json
{ "skillSlug": "bad-skill", "reason": "Contains malicious code" }
```

Auto-hide after 3 unique reports.

### GET /api/moderation/queue

Pending reports (moderator only).

### POST /api/moderation/action

Take moderation action (moderator only).

```json
{ "skillSlug": "bad-skill", "action": "hide" }
```

Actions: hide, unhide, delete, ban

---

## System

### GET /api/health

Health check. Returns service status and version.
