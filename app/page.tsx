import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "ClawHub — Agent Skill Marketplace",
  description:
    "Discover, install, and publish AI agent skills. The public registry for OpenClaw.",
};

export default function HomePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-8">
      <div className="max-w-3xl text-center">
        <h1 className="text-5xl font-bold tracking-tight">
          🦞 ClawHub
        </h1>
        <p className="mt-4 text-xl text-gray-600">
          The public marketplace for OpenClaw agent skills and plugins.
        </p>
        <p className="mt-2 text-gray-500">
          Discover capabilities. Install with one command. Publish your own.
        </p>

        <div className="mt-8 flex justify-center gap-4">
          <a
            href="/search"
            className="rounded-lg bg-blue-600 px-6 py-3 text-white hover:bg-blue-700"
          >
            Browse Skills
          </a>
          <a
            href="/publish"
            className="rounded-lg border px-6 py-3 hover:bg-gray-50"
          >
            Publish a Skill
          </a>
        </div>

        <div className="mt-16 grid grid-cols-1 gap-8 md:grid-cols-3">
          <div>
            <h3 className="text-lg font-semibold">🔍 Semantic Search</h3>
            <p className="mt-2 text-sm text-gray-600">
              Find skills by what they do, not just what they&apos;re called.
              Vector-powered discovery.
            </p>
          </div>
          <div>
            <h3 className="text-lg font-semibold">📦 Versioned Packages</h3>
            <p className="mt-2 text-sm text-gray-600">
              Every publish is a semver version. Changelogs, rollbacks, and
              audit trails included.
            </p>
          </div>
          <div>
            <h3 className="text-lg font-semibold">🛡️ Community Moderation</h3>
            <p className="mt-2 text-sm text-gray-600">
              Report abuse. Auto-hide after 3 reports. Moderator tools for
              governance.
            </p>
          </div>
        </div>

        <div className="mt-16">
          <h2 className="text-2xl font-bold">Quick Start</h2>
          <pre className="mt-4 rounded-lg bg-gray-900 p-4 text-left text-sm text-gray-100">
            <code>{`# Search for skills
clawhub search "calendar"

# Install a skill
clawhub install my-skill

# Publish your own
clawhub publish ./my-skill --slug my-skill --version 1.0.0`}</code>
          </pre>
        </div>

        <div className="mt-16">
          <h2 className="text-2xl font-bold">Popular Skills</h2>
          <p className="mt-2 text-gray-500">
            Coming soon — community-curated skill collections.
          </p>
        </div>
      </div>
    </main>
  );
}
