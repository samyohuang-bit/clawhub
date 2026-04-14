import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "API Reference | ClawHub",
  description: "ClawHub REST API reference for the agent skill marketplace.",
};

const endpoints = [
  {
    category: "Authentication",
    items: [
      { method: "GET", path: "/api/auth/login", desc: "Redirect to GitHub OAuth" },
      { method: "GET", path: "/api/auth/callback", desc: "Handle OAuth callback, issue JWT" },
      { method: "GET", path: "/api/auth/me", desc: "Current authenticated user" },
      { method: "POST", path: "/api/auth/me", desc: "Generate CLI API token (chub_ prefix)" },
    ],
  },
  {
    category: "Registry v1 (OpenClaw Compatible)",
    items: [
      { method: "GET", path: "/api/v1/search", desc: "Semantic + full-text skill search" },
      { method: "GET", path: "/api/v1/skills", desc: "List skills (paginated, sorted)" },
      { method: "POST", path: "/api/v1/skills", desc: "Publish a new skill (auth required)" },
      { method: "GET", path: "/api/v1/skills/:slug", desc: "Skill detail with versions" },
      { method: "POST", path: "/api/v1/skills/:slug/star", desc: "Star a skill" },
      { method: "DELETE", path: "/api/v1/skills/:slug/star", desc: "Unstar a skill" },
      { method: "GET", path: "/api/v1/skills/:slug/star", desc: "Check star status" },
      { method: "GET", path: "/api/v1/packages/:name", desc: "Package detail" },
      { method: "GET", path: "/api/v1/packages/:name/versions/:version", desc: "Specific version" },
      { method: "GET", path: "/api/v1/packages/:name/download", desc: "Download package bundle" },
      { method: "GET", path: "/api/v1/download", desc: "Generic download (query params)" },
    ],
  },
  {
    category: "Billing",
    items: [
      { method: "GET", path: "/api/billing/balance", desc: "Account balance, plan, usage" },
      { method: "POST", path: "/api/billing/usage", desc: "Record usage events (batched)" },
      { method: "GET", path: "/api/billing/usage", desc: "Usage breakdown by skill" },
      { method: "POST", path: "/api/billing/plan", desc: "Change plan (upgrade/downgrade)" },
      { method: "POST", path: "/api/billing/checkout", desc: "Create Stripe checkout session" },
      { method: "POST", path: "/api/billing/webhook", desc: "Stripe webhook handler" },
    ],
  },
  {
    category: "Moderation",
    items: [
      { method: "POST", path: "/api/moderation/report", desc: "Report a skill" },
      { method: "GET", path: "/api/moderation/queue", desc: "Pending reports (moderator)" },
      { method: "POST", path: "/api/moderation/action", desc: "Hide/unhide/delete/ban (moderator)" },
    ],
  },
  {
    category: "System",
    items: [
      { method: "GET", path: "/api/health", desc: "Health check endpoint" },
    ],
  },
];

const methodColors: Record<string, string> = {
  GET: "bg-green-100 text-green-800",
  POST: "bg-blue-100 text-blue-800",
  PUT: "bg-yellow-100 text-yellow-800",
  DELETE: "bg-red-100 text-red-800",
};

export default function DocsPage() {
  return (
    <main className="mx-auto max-w-4xl p-8">
      <h1 className="text-4xl font-bold">API Reference</h1>
      <p className="mt-2 text-gray-600">
        ClawHub REST API — compatible with OpenClaw CLI and clawhub CLI.
      </p>

      <div className="mt-4 rounded-lg bg-gray-50 p-4 text-sm">
        <strong>Base URL:</strong>{" "}
        <code className="rounded bg-gray-200 px-1">https://clawhub.ai</code>
        <br />
        <strong>Auth:</strong>{" "}
        <code className="rounded bg-gray-200 px-1">
          Authorization: Bearer &lt;token&gt;
        </code>{" "}
        or JWT cookie
        <br />
        <strong>Response:</strong>{" "}
        <code className="rounded bg-gray-200 px-1">
          {"{ ok: boolean, data?: T, error?: string }"}
        </code>
      </div>

      {endpoints.map((section) => (
        <section key={section.category} className="mt-10">
          <h2 className="text-2xl font-bold">{section.category}</h2>
          <div className="mt-4 space-y-2">
            {section.items.map((ep) => (
              <div
                key={ep.path}
                className="flex items-start gap-3 rounded-lg border p-3"
              >
                <span
                  className={`inline-block w-16 shrink-0 rounded px-2 py-0.5 text-center text-xs font-bold ${methodColors[ep.method]}`}
                >
                  {ep.method}
                </span>
                <div>
                  <code className="text-sm font-mono">{ep.path}</code>
                  <p className="mt-0.5 text-sm text-gray-600">{ep.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </section>
      ))}

      <section className="mt-10">
        <h2 className="text-2xl font-bold">OpenClaw CLI Integration</h2>
        <p className="mt-2 text-gray-600">
          OpenClaw CLI has native ClawHub support. These commands talk to the
          registry API automatically:
        </p>
        <pre className="mt-4 rounded-lg bg-gray-900 p-4 text-sm text-gray-100">
          <code>{`# Search for skills
openclaw skills search "calendar"

# Install a skill
openclaw skills install my-skill

# Update installed skills
openclaw skills update --all

# Install plugins
openclaw plugins install clawhub:my-plugin`}</code>
        </pre>
        <p className="mt-2 text-sm text-gray-500">
          Configure with{" "}
          <code className="rounded bg-gray-200 px-1">OPENCLAW_CLAWHUB_URL</code>{" "}
          env var (default: <code className="rounded bg-gray-200 px-1">https://clawhub.ai</code>).
        </p>
      </section>

      <section className="mt-10">
        <h2 className="text-2xl font-bold">Credit Packs</h2>
        <div className="mt-4 grid grid-cols-3 gap-4">
          {[
            { name: "Starter", price: "$10", credits: "1,500", rate: "$0.0067/call" },
            { name: "Power", price: "$45", credits: "8,000", rate: "$0.0056/call", best: true },
            { name: "Ultimate", price: "$150", credits: "30,000", rate: "$0.005/call" },
          ].map((pack) => (
            <div
              key={pack.name}
              className={`rounded-lg border p-4 ${pack.best ? "border-blue-500 bg-blue-50" : ""}`}
            >
              {pack.best && (
                <span className="mb-2 inline-block rounded bg-blue-500 px-2 py-0.5 text-xs text-white">
                  Best Value
                </span>
              )}
              <h3 className="text-lg font-bold">{pack.name}</h3>
              <p className="text-2xl font-bold">{pack.price}</p>
              <p className="text-sm text-gray-600">{pack.credits} credits</p>
              <p className="text-xs text-gray-500">{pack.rate}</p>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
