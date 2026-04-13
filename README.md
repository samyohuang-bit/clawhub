# ClawHub — Open Source Agent Marketplace

The public registry for OpenClaw skills and plugins.

Browse, discover, install, and publish agent skills. Open-source frontend for [clawhub.ai](https://clawhub.ai).

## What is this?

ClawHub is a marketplace where AI agent skills are:
- **Published** as versioned bundles (files + metadata)
- **Discovered** via search, tags, and usage signals
- **Installed** into OpenClaw workspaces with one command
- **Reviewed** by the community (stars, comments, reports)

This repo contains the **open-source frontend** and **registry API reference** for the ClawHub platform.

## Features

- 🔍 **Semantic Search** — Find skills by natural language description
- 📦 **Versioned Packages** — Every publish creates a semver version with changelog
- ⭐ **Community Signals** — Stars, downloads, and comments for quality ranking
- 🛡️ **Moderation** — Report abuse, auto-hide after 3+ reports, moderator tools
- 🔌 **Plugin Support** — Install plugins alongside skills
- 📱 **Responsive UI** — Works on desktop and mobile
- 🌐 **API-First** — Full REST API for CLI and programmatic access

## Quick Start

```bash
# Install dependencies
npm install

# Set up environment
cp .env.example .env.local

# Run development server
npm run dev

# Open http://localhost:3000
```

## Architecture

```
clawhub/
├── app/                    # Next.js App Router
│   ├── page.tsx            # Landing page
│   ├── search/             # Search & browse
│   ├── skill/[slug]/       # Skill detail pages
│   ├── user/[username]/    # User profiles
│   ├── publish/            # Publish wizard
│   └── api/                # Registry API routes
│       ├── skills/         # Skill CRUD
│       ├── search/         # Search endpoint
│       ├── auth/           # Authentication
│       └── moderation/     # Report & moderate
├── components/             # React components
├── lib/                    # Shared utilities
│   ├── registry.ts         # Registry client
│   ├── search.ts           # Search logic
│   └── auth.ts             # Auth helpers
├── types/                  # TypeScript definitions
└── public/                 # Static assets
```

## API Reference

### Skills

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/skills` | List skills (paginated) |
| GET | `/api/skills/[slug]` | Get skill details |
| POST | `/api/skills` | Publish a new skill |
| PUT | `/api/skills/[slug]` | Update a skill |
| DELETE | `/api/skills/[slug]` | Delete a skill (owner/admin) |
| POST | `/api/skills/[slug]/versions` | Publish a new version |
| GET | `/api/skills/[slug]/versions` | List all versions |

### Search

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/search?q=...` | Full-text + vector search |
| GET | `/api/search/tags?tag=...` | Search by tag |

### Auth

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/login` | GitHub OAuth login |
| POST | `/api/auth/token` | API token generation |
| GET | `/api/auth/me` | Current user info |

### Moderation

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/moderation/report` | Report a skill |
| GET | `/api/moderation/queue` | Moderator queue |
| POST | `/api/moderation/action` | Hide/unhide/delete/ban |

## Data Model

```typescript
interface Skill {
  slug: string;           // URL-friendly identifier
  name: string;           // Display name
  summary: string;        // Short description
  description: string;    // Full SKILL.md content
  tags: string[];         // Searchable tags
  author: User;           // Publisher
  versions: SkillVersion[];
  stars: number;          // Community stars
  downloads: number;      // Install count
  createdAt: Date;
  updatedAt: Date;
  status: 'active' | 'hidden' | 'deleted' | 'banned';
}

interface SkillVersion {
  semver: string;         // e.g., "1.2.3"
  changelog: string;      // What changed
  files: SkillFile[];     // Bundle contents
  publishedAt: Date;
  publishedBy: User;
}

interface User {
  username: string;
  githubId: string;       // GitHub-linked auth
  displayName: string;
  avatarUrl: string;
  skills: Skill[];        // Published skills
  createdAt: Date;
}
```

## CLI Integration

The ClawHub website is designed to work with the `clawhub` CLI and native `openclaw` commands:

```bash
# Search from CLI
clawhub search "calendar"
# → Calls GET /api/search?q=calendar

# Install from CLI
clawhub install my-skill
# → Downloads from GET /api/skills/my-skill/versions/latest/download

# Publish from CLI
clawhub publish ./my-skill --slug my-skill --version 1.0.0
# → Calls POST /api/skills/my-skill/versions
```

## Environment Variables

```env
# Database
DATABASE_URL=postgresql://...

# Auth
GITHUB_CLIENT_ID=...
GITHUB_CLIENT_SECRET=...
JWT_SECRET=...

# Search
OPENAI_API_KEY=...          # For vector embeddings

# Storage
S3_BUCKET=...
S3_REGION=...
AWS_ACCESS_KEY_ID=...
AWS_SECRET_ACCESS_KEY=...
```

## Development

```bash
# Install dependencies
npm install

# Run dev server
npm run dev

# Run tests
npm test

# Lint
npm run lint

# Build for production
npm run build
```

## Contributing

1. Fork the repo
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a PR

## License

MIT
