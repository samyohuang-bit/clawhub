# ClawHub Contributing Guide

## Welcome Contributors!

ClawHub is an open-source marketplace for OpenClaw agent skills. We welcome contributions of all kinds.

## Ways to Contribute

### 🐛 Bug Reports
- Search existing issues first
- Include steps to reproduce
- Include environment details (OS, Node version, browser)

### 💡 Feature Requests
- Describe the problem you're solving
- Explain your proposed solution
- Consider backwards compatibility

### 🔧 Code Contributions

#### Setting Up Development

```bash
# Fork and clone
git clone https://github.com/YOUR_USERNAME/clawhub.git
cd clawhub

# Install dependencies
npm install

# Set up environment
cp .env.example .env.local
# Edit .env.local with your values

# Run dev server
npm run dev
```

#### Project Structure

```
clawhub/
├── app/                    # Next.js App Router pages & API routes
├── components/             # Reusable React components
├── lib/                    # Shared utilities (registry client, search, auth)
├── types/                  # TypeScript type definitions
└── public/                 # Static assets
```

#### Code Style

- TypeScript strict mode
- ESLint + Prettier
- Functional components with hooks
- Server components by default, `"use client"` only when needed

#### Pull Request Process

1. Create a feature branch: `git checkout -b feature/my-feature`
2. Make your changes
3. Add tests for new functionality
4. Run linting: `npm run lint`
5. Run tests: `npm test`
6. Submit PR with clear description

### 📖 Documentation

- Fix typos and unclear sections
- Add examples and tutorials
- Translate documentation

## Architecture Decisions

### Why Next.js?
- Server-side rendering for SEO (skill pages need to be indexed)
- API routes for the registry backend
- React Server Components for performance
- App Router for modern patterns

### Why PostgreSQL?
- Full-text search with `tsvector`
- Vector search with `pgvector` for semantic discovery
- ACID transactions for publish/versioning
- Mature ecosystem

### Why S3?
- Skill bundles are files — S3 is the natural fit
- CDN integration for fast downloads
- Versioned storage

## Skill Publishing Flow

```
User runs: clawhub publish ./my-skill

1. CLI reads SKILL.md + all files in directory
2. CLI computes content hash
3. CLI POSTs to /api/skills/[slug]/versions
4. Server validates SKILL.md metadata
5. Server stores files in S3
6. Server creates SkillVersion in DB
7. Server generates embedding for search
8. Server returns version info to CLI
```

## API Design Principles

- RESTful endpoints with JSON responses
- `{ ok: boolean, data?: T, error?: string }` response envelope
- Pagination via `page` + `limit` query params
- Auth via JWT in `Authorization: Bearer <token>` header
- Rate limiting per user/IP

## Security Considerations

- GitHub account must be ≥1 week old to publish
- Content scanning for malicious patterns
- Report system with auto-hide after 3 unique reports
- API tokens are hashed before storage
- No code execution in skill install (files only)
