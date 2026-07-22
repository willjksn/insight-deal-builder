"use client";

import { useCallback, useEffect, useState } from "react";
import { Search } from "lucide-react";
import { Card, CardBody } from "@/components/ui/Card";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "@/lib/firebase/config";

interface SearchModeSettings {
  lightweightMode: boolean;
  autoCreditGuard: boolean;
}

interface BudgetStatus {
  used: number;
  cap: number;
  remaining: number;
  exhausted: boolean;
}

function Toggle({
  checked,
  disabled,
  onChange,
}: {
  checked: boolean;
  disabled?: boolean;
  onChange: (next: boolean) => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors disabled:opacity-50 ${
        checked ? "bg-sky-600" : "bg-slate-300"
      }`}
    >
      <span
        className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${
          checked ? "translate-x-5" : "translate-x-0.5"
        }`}
      />
    </button>
  );
}

export function SearchModePanel() {
  const [settings, setSettings] = useState<SearchModeSettings | null>(null);
  const [budget, setBudget] = useState<BudgetStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!auth?.currentUser) return;
    setLoading(true);
    setError(null);
    try {
      const token = await auth.currentUser.getIdToken();
      const res = await fetch("/api/admin/search-mode", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? "Could not load search mode");
      setSettings(body.settings as SearchModeSettings);
      setBudget(body.budget as BudgetStatus);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load search mode");
    } finally {
      setLoading(false);
    }
  }, []);

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
    const unsubscribe = onAuthStateChanged(auth, () => run());
    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, [load]);

  const update = async (patch: Partial<SearchModeSettings>) => {
    if (!auth?.currentUser || !settings) return;
    const previous = settings;
    setSettings({ ...settings, ...patch });
    setSaving(true);
    setError(null);
    try {
      const token = await auth.currentUser.getIdToken();
      const res = await fetch("/api/admin/search-mode", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(patch),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? "Could not save search mode");
      setSettings(body.settings as SearchModeSettings);
      setBudget(body.budget as BudgetStatus);
    } catch (e) {
      setSettings(previous); // roll back optimistic update
      setError(e instanceof Error ? e.message : "Could not save search mode");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mb-8">
      <div className="mb-4 flex items-center gap-2">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white">
          <Search className="h-4 w-4" />
        </div>
        <div>
          <h2 className="text-base font-semibold text-slate-900">Search mode</h2>
          <p className="text-xs text-slate-500">
            Controls live web search (Tavily) for revenue research & opportunity agents
          </p>
        </div>
      </div>

      {loading ? (
        <LoadingSpinner className="py-8" />
      ) : (
        <Card>
          <CardBody className="space-y-5 p-5">
            {error && (
              <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {error}
              </p>
            )}

            {settings && (
              <>
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-sm font-medium text-slate-900">Lightweight (rule-based) mode</p>
                    <p className="mt-0.5 text-xs text-slate-500">
                      Skip live web search entirely and use built-in rules. Best for conserving
                      credits. Turn off to use Tavily again.
                    </p>
                  </div>
                  <Toggle
                    checked={settings.lightweightMode}
                    disabled={saving}
                    onChange={(v) => void update({ lightweightMode: v })}
                  />
                </div>

                <div className="flex items-start justify-between gap-4 border-t border-slate-100 pt-5">
                  <div>
                    <p className="text-sm font-medium text-slate-900">
                      Auto-switch near the monthly cap
                    </p>
                    <p className="mt-0.5 text-xs text-slate-500">
                      Automatically fall back to rules as Tavily credits run low. Turn off to keep
                      using live search up to the hard cap.
                    </p>
                  </div>
                  <Toggle
                    checked={settings.autoCreditGuard}
                    disabled={saving || settings.lightweightMode}
                    onChange={(v) => void update({ autoCreditGuard: v })}
                  />
                </div>

                {budget && (
                  <div className="rounded-xl bg-slate-50 px-4 py-3 text-sm text-slate-600">
                    <span className="font-medium text-slate-900">
                      {budget.used.toLocaleString()}/{budget.cap.toLocaleString()}
                    </span>{" "}
                    Tavily credits used this month · {budget.remaining.toLocaleString()} remaining
                    {settings.lightweightMode ? (
                      <span className="ml-1 font-medium text-amber-700">
                        · live search is off (lightweight mode)
                      </span>
                    ) : budget.exhausted ? (
                      <span className="ml-1 font-medium text-amber-700">· near cap — using rules</span>
                    ) : null}
                  </div>
                )}
              </>
            )}
          </CardBody>
        </Card>
      )}
    </div>
  );
}
