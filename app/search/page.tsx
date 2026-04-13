"use client";

import { useState } from "react";

export default function SearchPage() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (!query.trim()) return;

    setLoading(true);
    try {
      const res = await fetch(
        `/api/search?q=${encodeURIComponent(query)}&limit=20`
      );
      const data = await res.json();
      if (data.ok) {
        setResults(data.data.skills);
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="mx-auto max-w-4xl p-8">
      <h1 className="text-3xl font-bold">Search Skills</h1>
      <p className="mt-2 text-gray-600">
        Find agent skills by name, description, or capability.
      </p>

      <form onSubmit={handleSearch} className="mt-6 flex gap-2">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="e.g., calendar integration, postgres backups, web scraping..."
          className="flex-1 rounded-lg border px-4 py-2"
        />
        <button
          type="submit"
          disabled={loading}
          className="rounded-lg bg-blue-600 px-6 py-2 text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? "Searching..." : "Search"}
        </button>
      </form>

      <div className="mt-8">
        {results.length === 0 && query && !loading && (
          <p className="text-gray-500">No skills found. Try a different search.</p>
        )}

        {results.map((skill) => (
          <a
            key={skill.slug}
            href={`/skill/${skill.slug}`}
            className="block rounded-lg border p-4 hover:bg-gray-50"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">{skill.name}</h3>
              <span className="text-sm text-gray-500">⭐ {skill.stars}</span>
            </div>
            <p className="mt-1 text-sm text-gray-600">{skill.summary}</p>
            <div className="mt-2 flex gap-2">
              {skill.tags?.map((tag: string) => (
                <span
                  key={tag}
                  className="rounded bg-gray-100 px-2 py-0.5 text-xs"
                >
                  {tag}
                </span>
              ))}
            </div>
          </a>
        ))}
      </div>
    </main>
  );
}
