"use client";

import { useState, useEffect } from "react";

interface Balance {
  plan: string;
  planLimits: {
    calls_per_month: number;
    tokens_per_month: number;
    price_cents: number;
  };
  currentUsage: { calls: number; tokens: number };
  remaining: { calls: number; tokens: number };
  credits: number;
  period: { start: string; end: string };
}

interface UsageBreakdown {
  skill_slug: string;
  calls: number;
  tokens: number;
}

const PLAN_NAMES: Record<string, string> = {
  free: "Free",
  pro: "Pro",
  team: "Team",
  enterprise: "Enterprise",
};

const PLAN_PRICES: Record<string, string> = {
  free: "$0",
  pro: "$29/mo",
  team: "$99/mo",
  enterprise: "Custom",
};

export default function BillingPage() {
  const [balance, setBalance] = useState<Balance | null>(null);
  const [breakdown, setBreakdown] = useState<UsageBreakdown[]>([]);
  const [loading, setLoading] = useState(true);
  const [checkoutLoading, setCheckoutLoading] = useState(false);

  useEffect(() => {
    async function fetchData() {
      try {
        const [balRes, usageRes] = await Promise.all([
          fetch("/api/billing/balance"),
          fetch("/api/billing/usage"),
        ]);
        const balData = await balRes.json();
        const usageData = await usageRes.json();
        if (balData.ok) setBalance(balData.data);
        if (usageData.ok) setBreakdown(usageData.data.breakdown);
      } catch (err) {
        console.error("Failed to load billing data:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  async function handleCheckout(type: string, item: string) {
    setCheckoutLoading(true);
    try {
      const res = await fetch("/api/billing/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          type === "credits"
            ? { type: "credits", pack: item }
            : { type: "subscription", plan: item }
        ),
      });
      const data = await res.json();
      if (data.ok && data.data.url) {
        window.location.href = data.data.url;
      }
    } catch (err) {
      console.error("Checkout error:", err);
    } finally {
      setCheckoutLoading(false);
    }
  }

  if (loading) {
    return (
      <main className="mx-auto max-w-4xl p-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 w-48 rounded bg-gray-200" />
          <div className="h-32 rounded bg-gray-200" />
          <div className="h-64 rounded bg-gray-200" />
        </div>
      </main>
    );
  }

  const usagePercent = balance
    ? Math.round(
        (balance.currentUsage.calls / balance.planLimits.calls_per_month) * 100
      )
    : 0;

  return (
    <main className="mx-auto max-w-4xl p-8">
      <h1 className="text-3xl font-bold">Billing Dashboard</h1>

      {/* Plan Card */}
      <div className="mt-6 rounded-lg border p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold">
              {PLAN_NAMES[balance?.plan ?? "free"]} Plan
            </h2>
            <p className="text-gray-500">
              {PLAN_PRICES[balance?.plan ?? "free"]}
            </p>
          </div>
          {balance?.plan === "free" && (
            <button
              onClick={() => handleCheckout("subscription", "pro")}
              disabled={checkoutLoading}
              className="rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 disabled:opacity-50"
            >
              Upgrade to Pro
            </button>
          )}
        </div>

        {/* Usage Bar */}
        <div className="mt-4">
          <div className="flex justify-between text-sm">
            <span>
              {balance?.currentUsage.calls.toLocaleString()} /{" "}
              {balance?.planLimits.calls_per_month.toLocaleString()} calls
            </span>
            <span
              className={
                usagePercent > 80 ? "text-red-600" : "text-gray-500"
              }
            >
              {usagePercent}%
            </span>
          </div>
          <div className="mt-1 h-3 rounded-full bg-gray-200">
            <div
              className={`h-3 rounded-full transition-all ${
                usagePercent > 80 ? "bg-red-500" : "bg-blue-500"
              }`}
              style={{ width: `${Math.min(usagePercent, 100)}%` }}
            />
          </div>
        </div>

        {/* Credits */}
        {balance && balance.credits > 0 && (
          <p className="mt-2 text-sm text-gray-600">
            + {balance.credits.toLocaleString()} prepaid credits remaining
          </p>
        )}

        {/* Period */}
        <p className="mt-2 text-xs text-gray-400">
          Period:{" "}
          {new Date(balance?.period.start ?? "").toLocaleDateString()} —{" "}
          {new Date(balance?.period.end ?? "").toLocaleDateString()}
        </p>
      </div>

      {/* Usage Breakdown */}
      <div className="mt-6 rounded-lg border p-6">
        <h2 className="text-xl font-bold">Usage by Skill</h2>
        {breakdown.length === 0 ? (
          <p className="mt-2 text-gray-500">No usage this period.</p>
        ) : (
          <div className="mt-4 space-y-2">
            {breakdown.map((item) => (
              <div
                key={item.skill_slug}
                className="flex items-center justify-between rounded bg-gray-50 p-3"
              >
                <span className="font-mono text-sm">{item.skill_slug}</span>
                <div className="flex gap-4 text-sm text-gray-600">
                  <span>{item.calls} calls</span>
                  <span>{Number(item.tokens).toLocaleString()} tokens</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Credit Packs */}
      <div className="mt-6 rounded-lg border p-6">
        <h2 className="text-xl font-bold">Buy Credits</h2>
        <div className="mt-4 grid grid-cols-3 gap-4">
          {[
            {
              id: "starter",
              name: "Starter",
              price: "$10",
              credits: "1,500",
              rate: "$0.0067/call",
            },
            {
              id: "power",
              name: "Power",
              price: "$45",
              credits: "8,000",
              rate: "$0.0056/call",
              best: true,
            },
            {
              id: "ultimate",
              name: "Ultimate",
              price: "$150",
              credits: "30,000",
              rate: "$0.005/call",
            },
          ].map((pack) => (
            <div
              key={pack.id}
              className={`rounded-lg border p-4 ${
                pack.best ? "border-blue-500 bg-blue-50" : ""
              }`}
            >
              {pack.best && (
                <span className="mb-2 inline-block rounded bg-blue-500 px-2 py-0.5 text-xs text-white">
                  Best Value
                </span>
              )}
              <h3 className="font-bold">{pack.name}</h3>
              <p className="text-2xl font-bold">{pack.price}</p>
              <p className="text-sm text-gray-600">{pack.credits} credits</p>
              <p className="text-xs text-gray-500">{pack.rate}</p>
              <button
                onClick={() => handleCheckout("credits", pack.id)}
                disabled={checkoutLoading}
                className="mt-3 w-full rounded bg-gray-900 px-3 py-1.5 text-sm text-white hover:bg-gray-800 disabled:opacity-50"
              >
                Buy
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Plan Comparison */}
      <div className="mt-6 rounded-lg border p-6">
        <h2 className="text-xl font-bold">Plans</h2>
        <div className="mt-4 grid grid-cols-4 gap-4 text-sm">
          <div />
          {["Free", "Pro", "Team", "Enterprise"].map((plan) => (
            <div key={plan} className="text-center font-bold">
              {plan}
            </div>
          ))}
          <div className="text-gray-600">Price</div>
          {["$0", "$29/mo", "$99/mo", "Custom"].map((p) => (
            <div key={p} className="text-center">
              {p}
            </div>
          ))}
          <div className="text-gray-600">Calls/mo</div>
          {["100", "5,000", "25,000", "100,000+"].map((c) => (
            <div key={c} className="text-center">
              {c}
            </div>
          ))}
          <div className="text-gray-600">Overage</div>
          {["Hard limit", "$0.008/call", "$0.006/call", "Negotiated"].map(
            (o) => (
              <div key={o} className="text-center">
                {o}
              </div>
            )
          )}
        </div>
      </div>
    </main>
  );
}
