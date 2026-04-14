-- 001_initial_schema.sql
-- ClawHub Core Database Schema
-- Run: psql -d clawhub -f db/migrations/001_initial_schema.sql

BEGIN;

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS vector;

-- ============================================================
-- Users (GitHub OAuth)
-- ============================================================
CREATE TABLE users (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    username        TEXT UNIQUE NOT NULL,
    github_id       TEXT UNIQUE NOT NULL,
    display_name    TEXT,
    avatar_url      TEXT,
    email           TEXT,
    is_moderator    BOOLEAN DEFAULT FALSE,
    is_banned       BOOLEAN DEFAULT FALSE,
    created_at      TIMESTAMPTZ DEFAULT now(),
    updated_at      TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_users_github_id ON users(github_id);
CREATE INDEX idx_users_username ON users(username);

-- ============================================================
-- Skills
-- ============================================================
CREATE TABLE skills (
    slug            TEXT PRIMARY KEY,
    name            TEXT NOT NULL,
    summary         TEXT DEFAULT '',
    description     TEXT DEFAULT '',
    tags            TEXT[] DEFAULT '{}',
    author_id       UUID NOT NULL REFERENCES users(id),
    latest_version  TEXT DEFAULT '0.0.0',
    stars           INTEGER DEFAULT 0,
    downloads       INTEGER DEFAULT 0,
    status          TEXT DEFAULT 'active' CHECK (status IN ('active', 'hidden', 'deleted', 'banned')),
    created_at      TIMESTAMPTZ DEFAULT now(),
    updated_at      TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_skills_author ON skills(author_id);
CREATE INDEX idx_skills_tags ON skills USING GIN(tags);
CREATE INDEX idx_skills_status ON skills(status);
CREATE INDEX idx_skills_stars ON skills(stars DESC);
CREATE INDEX idx_skills_downloads ON skills(downloads DESC);
CREATE INDEX idx_skills_created ON skills(created_at DESC);

-- Full-text search index
ALTER TABLE skills ADD COLUMN search_vector tsvector
    GENERATED ALWAYS AS (
        setweight(to_tsvector('english', coalesce(name, '')), 'A') ||
        setweight(to_tsvector('english', coalesce(summary, '')), 'B') ||
        setweight(to_tsvector('english', coalesce(description, '')), 'C')
    ) STORED;

CREATE INDEX idx_skills_search ON skills USING GIN(search_vector);

-- ============================================================
-- Skill Versions
-- ============================================================
CREATE TABLE skill_versions (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    skill_slug      TEXT NOT NULL REFERENCES skills(slug) ON DELETE CASCADE,
    semver          TEXT NOT NULL,
    changelog       TEXT DEFAULT '',
    content_hash    TEXT NOT NULL,
    files           JSONB NOT NULL DEFAULT '[]',
    published_by    UUID NOT NULL REFERENCES users(id),
    download_count  INTEGER DEFAULT 0,
    published_at    TIMESTAMPTZ DEFAULT now(),
    UNIQUE(skill_slug, semver)
);

CREATE INDEX idx_versions_skill ON skill_versions(skill_slug);
CREATE INDEX idx_versions_published ON skill_versions(published_at DESC);

-- ============================================================
-- Skill Embeddings (pgvector for semantic search)
-- ============================================================
CREATE TABLE skill_embeddings (
    skill_slug      TEXT PRIMARY KEY REFERENCES skills(slug) ON DELETE CASCADE,
    embedding       vector(1536) NOT NULL,
    updated_at      TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_embeddings_vector ON skill_embeddings
    USING ivfflat(embedding vector_cosine_ops) WITH (lists = 100);

-- ============================================================
-- Stars
-- ============================================================
CREATE TABLE stars (
    user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    skill_slug      TEXT NOT NULL REFERENCES skills(slug) ON DELETE CASCADE,
    created_at      TIMESTAMPTZ DEFAULT now(),
    PRIMARY KEY (user_id, skill_slug)
);

CREATE INDEX idx_stars_skill ON stars(skill_slug);

-- ============================================================
-- Reports (moderation)
-- ============================================================
CREATE TABLE reports (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    skill_slug      TEXT NOT NULL REFERENCES skills(slug) ON DELETE CASCADE,
    reporter_id     UUID NOT NULL REFERENCES users(id),
    reason          TEXT NOT NULL,
    status          TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'reviewed', 'dismissed')),
    created_at      TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_reports_skill ON reports(skill_slug);
CREATE INDEX idx_reports_status ON reports(status);

-- Auto-hide skill when it has 3+ unique pending reports
CREATE OR REPLACE FUNCTION check_auto_hide()
RETURNS TRIGGER AS $$
BEGIN
    IF (SELECT COUNT(DISTINCT reporter_id) FROM reports
        WHERE skill_slug = NEW.skill_slug AND status = 'pending') >= 3 THEN
        UPDATE skills SET status = 'hidden', updated_at = now()
        WHERE slug = NEW.skill_slug AND status = 'active';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_auto_hide
    AFTER INSERT ON reports
    FOR EACH ROW EXECUTE FUNCTION check_auto_hide();

-- ============================================================
-- API Tokens (for CLI auth)
-- ============================================================
CREATE TABLE api_tokens (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash      TEXT NOT NULL,
    label           TEXT DEFAULT 'CLI token',
    last_used_at    TIMESTAMPTZ,
    created_at      TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_tokens_user ON api_tokens(user_id);
CREATE INDEX idx_tokens_hash ON api_tokens(token_hash);

-- ============================================================
-- Updated_at trigger
-- ============================================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_skills_updated
    BEFORE UPDATE ON skills
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trigger_users_updated
    BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

COMMIT;
