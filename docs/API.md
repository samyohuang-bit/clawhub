# ClawHub API Reference

Base URL: `https://clawhub.ai/api`

## Authentication

All write endpoints require authentication. Include a JWT token or API token:

```
Authorization: Bearer <token>
```

### POST /auth/login
GitHub OAuth flow initiation.

**Response:** Redirect to GitHub

### POST /auth/token
Generate an API token for CLI use.

**Headers:** `Authorization: Bearer <jwt>`

**Response:**
```json
{
  "ok": true,
  "data": {
    "token": "chub_abc123...",
    "prefix": "chub_",
    "createdAt": "2026-04-14T00:00:00Z"
  }
}
```

### GET /auth/me
Get current user profile.

**Response:**
```json
{
  "ok": true,
  "data": {
    "username": "octocat",
    "githubId": "583231",
    "displayName": "The Octocat",
    "avatarUrl": "https://avatars.githubusercontent.com/u/583231",
    "createdAt": "2026-03-01T00:00:00Z"
  }
}
```

---

## Skills

### GET /skills
List skills with pagination.

**Query Params:**
| Param | Type | Default | Description |
|-------|------|---------|-------------|
| page | int | 1 | Page number |
| limit | int | 20 | Results per page (max 100) |
| sort | string | recent | `recent`, `stars`, `downloads` |

**Response:**
```json
{
  "ok": true,
  "data": {
    "skills": [...],
    "total": 150,
    "page": 1,
    "totalPages": 8
  }
}
```

### GET /skills/:slug
Get skill details including latest version.

**Response:**
```json
{
  "ok": true,
  "data": {
    "slug": "my-skill",
    "name": "My Skill",
    "summary": "Does amazing things",
    "description": "# My Skill\nFull SKILL.md content...",
    "tags": ["productivity", "calendar"],
    "author": { "username": "octocat", ... },
    "latestVersion": "1.2.0",
    "stars": 42,
    "downloads": 1337,
    "createdAt": "2026-03-15T00:00:00Z",
    "updatedAt": "2026-04-10T00:00:00Z",
    "status": "active"
  }
}
```

### POST /skills
Publish a new skill.

**Headers:** `Authorization: Bearer <token>`

**Body:**
```json
{
  "slug": "my-skill",
  "name": "My Skill",
  "version": "1.0.0",
  "changelog": "Initial release",
  "tags": ["productivity"],
  "files": [
    { "path": "SKILL.md", "content": "..." },
    { "path": "scripts/run.sh", "content": "..." }
  ]
}
```

### GET /skills/:slug/versions
List all versions of a skill.

### POST /skills/:slug/versions
Publish a new version of an existing skill.

**Headers:** `Authorization: Bearer <token>`

---

## Search

### GET /search
Full-text + vector search.

**Query Params:**
| Param | Type | Description |
|-------|------|-------------|
| q | string | Search query |
| tags | string | Comma-separated tags |
| page | int | Page number |
| limit | int | Results per page |
| sort | string | `relevance`, `stars`, `downloads`, `recent` |

---

## Moderation

### POST /moderation/report
Report a skill for review.

**Headers:** `Authorization: Bearer <token>`

**Body:**
```json
{
  "skillSlug": "bad-skill",
  "reason": "Contains malicious code"
}
```

### GET /moderation/queue
Get pending reports (moderator only).

### POST /moderation/action
Take moderation action (moderator only).

**Body:**
```json
{
  "skillSlug": "bad-skill",
  "action": "hide",  // hide | unhide | delete | ban
  "reason": "Violates ToS"
}
```

---

## Stars

### POST /skills/:slug/star
Star a skill.

### DELETE /skills/:slug/star
Unstar a skill.

### GET /skills/:slug/stars
Get star count and whether current user has starred.
