"use client";

import { useCallback, useEffect, useState } from "react";
import {
  revenueAddSuppression,
  revenueDeleteSuppression,
  revenueListSuppression,
} from "@/lib/revenueOpportunities/apiClient";
import type {
  RevenueSuppressionEntry,
  RevenueSuppressionKind,
} from "@/lib/revenueOpportunities/types/suppression";
import { Button } from "@/components/ui/Button";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";

export function SuppressionListPanel({
  getToken,
  canManage,
}: {
  getToken: () => Promise<string | null>;
  canManage: boolean;
}) {
  const [entries, setEntries] = useState<RevenueSuppressionEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [kind, setKind] = useState<RevenueSuppressionKind>("email");
  const [value, setValue] = useState("");
  const [reason, setReason] = useState("");

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await revenueListSuppression(getToken);
      setEntries(res.entries);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load suppression list");
    } finally {
      setLoading(false);
    }
  }, [getToken]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const add = async () => {
    if (!canManage || !value.trim()) return;
    setBusy(true);
    setError(null);
    try {
      await revenueAddSuppression(getToken, {
        kind,
        value: value.trim(),
        reason: reason.trim() || undefined,
      });
      setValue("");
      setReason("");
      await reload();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not add");
    } finally {
      setBusy(false);
    }
  };

  const remove = async (id: string) => {
    if (!canManage) return;
    setBusy(true);
    setError(null);
    try {
      await revenueDeleteSuppression(getToken, id);
      await reload();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not remove");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card className="mt-6">
      <CardHeader>
        <h3 className="font-semibold text-slate-900">Suppression list</h3>
        <p className="text-xs text-slate-500">
          Blocked emails and domains — approving outreach to a match is rejected until removed.
        </p>
      </CardHeader>
      <CardBody className="space-y-4 text-sm">
        {loading && <p className="text-slate-500">Loading…</p>}
        {error && <p className="text-red-600">{error}</p>}
        {canManage ? (
          <div className="grid gap-3 sm:grid-cols-[140px_1fr_1fr_auto] sm:items-end">
            <Select
              label="Kind"
              value={kind}
              onChange={(e) => setKind(e.target.value as RevenueSuppressionKind)}
              options={[
                { value: "email", label: "Email" },
                { value: "domain", label: "Domain" },
              ]}
            />
            <Input
              label={kind === "email" ? "Email" : "Domain"}
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder={kind === "email" ? "name@brand.com" : "brand.com"}
            />
            <Input
              label="Reason (optional)"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Unsubscribe / do not contact"
            />
            <Button size="touch" disabled={busy || !value.trim()} onClick={() => void add()}>
              Add
            </Button>
          </div>
        ) : null}
        <ul className="divide-y divide-slate-100 rounded-xl border border-slate-100">
          {entries.length === 0 && !loading ? (
            <li className="px-3 py-3 text-slate-500">No suppressed contacts yet.</li>
          ) : null}
          {entries.map((entry) => (
            <li key={entry.id} className="flex flex-wrap items-center justify-between gap-2 px-3 py-2">
              <div>
                <p className="font-medium text-slate-900">
                  <span className="text-slate-500">{entry.kind}:</span> {entry.value}
                </p>
                {entry.reason ? <p className="text-xs text-slate-500">{entry.reason}</p> : null}
              </div>
              {canManage ? (
                <Button
                  size="sm"
                  variant="outline"
                  disabled={busy}
                  onClick={() => void remove(entry.id)}
                >
                  Remove
                </Button>
              ) : null}
            </li>
          ))}
        </ul>
      </CardBody>
    </Card>
  );
}
