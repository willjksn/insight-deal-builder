"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Sparkles, TrendingUp } from "lucide-react";
import { Card, CardBody } from "@/components/ui/Card";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { InfoCallout } from "@/components/ui/PageSection";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "@/lib/firebase/config";
import {
  AI_USAGE_FEATURE_LABELS,
  AiUsageMonthlySummary,
} from "@/lib/ai/usageTypes";
import { formatUsd } from "@/lib/ai/usagePricing";

function currentMonthKey(): string {
  const d = new Date();
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

function featureLabel(key: string): string {
  return AI_USAGE_FEATURE_LABELS[key] ?? key.replace(/_/g, " ");
}

const KIND_LABELS: Record<string, string> = {
  gemini_text: "Gemini / Vertex — text & JSON",
  gemini_image: "Gemini / Vertex — images",
  tavily_basic: "Tavily — basic search",
  tavily_advanced: "Tavily — advanced search",
  openai_image: "OpenAI — images",
};

export function AiUsagePanel() {
  const [summary, setSummary] = useState<AiUsageMonthlySummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const monthKey = useMemo(() => currentMonthKey(), []);

  const load = useCallback(async () => {
    if (!auth?.currentUser) return;
    setLoading(true);
    setError(null);
    try {
      const token = await auth.currentUser.getIdToken();
      const res = await fetch(`/api/admin/ai-usage?month=${encodeURIComponent(monthKey)}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? "Could not load AI usage");
      setSummary(body.summary as AiUsageMonthlySummary);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load AI usage");
    } finally {
      setLoading(false);
    }
  }, [monthKey]);

  useEffect(() => {
    if (!auth) {
      setLoading(false);
      return;
    }

    let cancelled = false;

    const run = () => {
      if (!cancelled) void load();
    };

    if (auth.currentUser) run();

    const unsubscribe = onAuthStateChanged(auth, () => {
      run();
    });

    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, [load]);

  const topFeatures = useMemo(() => {
    if (!summary?.byFeature) return [];
    return Object.entries(summary.byFeature)
      .sort((a, b) => b[1].estimatedUsd - a[1].estimatedUsd)
      .slice(0, 8);
  }, [summary]);

  const byKind = useMemo(() => {
    if (!summary?.byKind) return [];
    return Object.entries(summary.byKind).sort((a, b) => b[1].estimatedUsd - a[1].estimatedUsd);
  }, [summary]);

  return (
    <div className="mb-8">
      <div className="mb-4 flex items-center gap-2">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 text-white">
          <Sparkles className="h-4 w-4" />
        </div>
        <div>
          <h2 className="text-base font-semibold text-slate-900">AI usage estimate</h2>
          <p className="text-xs text-slate-500">
            {monthKey} · Gemini, Vertex, Tavily, OpenAI — logged on each API call
          </p>
        </div>
      </div>

      {loading ? (
        <LoadingSpinner className="py-8" />
      ) : error ? (
        <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>
      ) : summary ? (
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Card className="border-violet-200/80 bg-gradient-to-br from-violet-50/80 to-white">
              <CardBody className="p-4">
                <p className="text-xs font-medium uppercase tracking-wide text-violet-800/70">
                  Est. spend this month
                </p>
                <p className="mt-1 text-2xl font-bold tabular-nums text-violet-950">
                  {formatUsd(summary.totalEstimatedUsd)}
                </p>
                <p className="mt-1 text-xs text-slate-500">{summary.callCount} AI calls</p>
              </CardBody>
            </Card>
            <Card>
              <CardBody className="p-4">
                <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Images generated</p>
                <p className="mt-1 text-lg font-semibold tabular-nums text-slate-900">
                  {summary.imageCount.toLocaleString()}
                </p>
                <p className="mt-1 text-xs text-slate-500">Scout previs & diagrams</p>
              </CardBody>
            </Card>
            <Card>
              <CardBody className="p-4">
                <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Tavily credits</p>
                <p className="mt-1 text-lg font-semibold tabular-nums text-slate-900">
                  {summary.tavilyCredits.toLocaleString()}
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  ~{formatUsd(summary.tavilyCredits * 0.008)} at pay-as-you-go
                </p>
              </CardBody>
            </Card>
          </div>

          <InfoCallout variant="blue">
            Estimates use published list prices (Gemini 2.5 Flash $0.30/$2.50 per 1M tokens, images ~$0.039 each,
            Tavily $0.008/credit). Actual bills may differ with free tiers, Vertex billing, or missing token metadata.
          </InfoCallout>

          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardBody className="p-4">
                <p className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-900">
                  <TrendingUp className="h-4 w-4 text-violet-600" />
                  By feature
                </p>
                {topFeatures.length === 0 ? (
                  <p className="text-sm text-slate-500">No AI calls recorded yet this month.</p>
                ) : (
                  <ul className="space-y-2">
                    {topFeatures.map(([key, row]) => (
                      <li
                        key={key}
                        className="flex items-center justify-between gap-3 rounded-lg bg-slate-50 px-3 py-2 text-sm"
                      >
                        <span className="min-w-0 truncate text-slate-700">{featureLabel(key)}</span>
                        <span className="shrink-0 font-medium tabular-nums text-slate-900">
                          {formatUsd(row.estimatedUsd)}
                          <span className="ml-1 text-xs font-normal text-slate-500">({row.calls})</span>
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </CardBody>
            </Card>

            <Card>
              <CardBody className="p-4">
                <p className="mb-3 text-sm font-semibold text-slate-900">By provider / kind</p>
                {byKind.length === 0 ? (
                  <p className="text-sm text-slate-500">No breakdown yet.</p>
                ) : (
                  <ul className="space-y-2">
                    {byKind.map(([key, row]) => (
                      <li
                        key={key}
                        className="flex items-center justify-between gap-3 rounded-lg bg-slate-50 px-3 py-2 text-sm"
                      >
                        <span className="text-slate-700">{KIND_LABELS[key] ?? key}</span>
                        <span className="font-medium tabular-nums text-slate-900">
                          {formatUsd(row.estimatedUsd)}
                          <span className="ml-1 text-xs font-normal text-slate-500">({row.calls})</span>
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </CardBody>
            </Card>
          </div>

          {summary.updatedAt && (
            <p className="text-xs text-slate-400">
              Last updated {new Date(summary.updatedAt).toLocaleString()}
            </p>
          )}
        </div>
      ) : null}
    </div>
  );
}
