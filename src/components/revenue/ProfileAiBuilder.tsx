"use client";

import { useState } from "react";
import { Check, Sparkles, X } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import {
  revenueDraftProfile,
  revenueResolveProfilePending,
} from "@/lib/revenueOpportunities/apiClient";
import type {
  BusinessProfile,
  BusinessProfileFields,
  BusinessProfilePendingChange,
} from "@/lib/revenueOpportunities/types/businessProfile";
import { PROFILE_FIELD_GROUPS } from "@/lib/revenueOpportunities/profileFields";
import { Button } from "@/components/ui/Button";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";

const FIELD_LABEL = new Map<keyof BusinessProfileFields, string>(
  PROFILE_FIELD_GROUPS.flatMap((g) => g.fields).map((f) => [f.key, f.label])
);

export function ProfileAiBuilder({
  profileId,
  pendingChanges,
  onUpdated,
}: {
  profileId: string;
  pendingChanges: BusinessProfilePendingChange[];
  onUpdated: (profile: BusinessProfile) => void;
}) {
  const { user } = useAuth();
  const [sourceText, setSourceText] = useState("");
  const [sourceUrl, setSourceUrl] = useState("");
  const [drafting, setDrafting] = useState(false);
  const [resolvingId, setResolvingId] = useState<string | null>(null);
  const [bulkBusy, setBulkBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const pending = pendingChanges.filter((c) => c.status === "pending");

  const runDraft = async () => {
    if (!user) return;
    setDrafting(true);
    setError(null);
    setMessage(null);
    try {
      const res = await revenueDraftProfile(() => user.getIdToken(), profileId, {
        sourceText: sourceText.trim() || undefined,
        sourceUrl: sourceUrl.trim() || undefined,
      });
      onUpdated(res.profile);
      const base = res.usedLiveAi
        ? `AI drafted ${res.suggestionCount} suggestion${res.suggestionCount === 1 ? "" : "s"} for review.`
        : `Mock draft created ${res.suggestionCount} suggestion${res.suggestionCount === 1 ? "" : "s"} (SCOUT_USE_MOCK_AI enabled).`;
      setMessage(res.notes.length ? `${base} Notes: ${res.notes.join(" · ")}` : base);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Draft failed");
    } finally {
      setDrafting(false);
    }
  };

  const resolve = async (action: "approve" | "reject", changeIds?: string[]) => {
    if (!user) return;
    const single = changeIds?.length === 1 ? changeIds[0] : null;
    if (single) setResolvingId(single);
    else setBulkBusy(true);
    setError(null);
    try {
      const res = await revenueResolveProfilePending(
        () => user.getIdToken(),
        profileId,
        action,
        changeIds
      );
      onUpdated(res.profile);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not update suggestion");
    } finally {
      setResolvingId(null);
      setBulkBusy(false);
    }
  };

  const busy = drafting || bulkBusy || resolvingId != null;

  return (
    <Card className="mt-8 border-sky-200 bg-sky-50/40">
      <CardHeader>
        <h3 className="flex items-center gap-2 font-semibold text-slate-900">
          <Sparkles className="h-4 w-4 text-sky-600" />
          Draft with AI
        </h3>
        <p className="text-sm text-slate-500">
          Paste a website, bio, or media kit — the AI proposes field updates for your review. Nothing
          is applied until you approve it.
        </p>
      </CardHeader>
      <CardBody className="space-y-4">
        <Textarea
          label="Paste material"
          rows={5}
          value={sourceText}
          placeholder="Paste an about page, capabilities deck, bio, media kit, etc."
          onChange={(e) => setSourceText(e.target.value)}
        />
        <Input
          label="Or a URL to research (optional)"
          value={sourceUrl}
          placeholder="https://example.com"
          onChange={(e) => setSourceUrl(e.target.value)}
        />
        <Button
          type="button"
          size="touch"
          disabled={busy || (!sourceText.trim() && !sourceUrl.trim())}
          onClick={runDraft}
        >
          <Sparkles className="mr-2 h-4 w-4" />
          {drafting ? "Drafting…" : "Draft suggestions"}
        </Button>

        {error && <p className="text-sm text-red-600">{error}</p>}
        {message && <p className="text-sm text-emerald-700">{message}</p>}

        {pending.length > 0 ? (
          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm font-semibold text-slate-900">
                {pending.length} suggestion{pending.length === 1 ? "" : "s"} awaiting review
              </p>
              <div className="flex gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={busy}
                  onClick={() => resolve("approve")}
                >
                  Approve all
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={busy}
                  onClick={() => resolve("reject")}
                >
                  Reject all
                </Button>
              </div>
            </div>
            <div className="space-y-3">
              {pending.map((change) => (
                <div
                  key={change.id}
                  className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-100 pb-3 last:border-0"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-slate-900">
                      {FIELD_LABEL.get(change.field) ?? change.field}
                      {typeof change.confidence === "number" ? (
                        <span className="ml-2 text-xs font-normal text-slate-400">
                          {Math.round(change.confidence * 100)}% confidence
                        </span>
                      ) : null}
                    </p>
                    <p className="mt-0.5 text-xs text-slate-500">
                      {change.currentValue ? (
                        <span className="line-through">{change.currentValue}</span>
                      ) : (
                        <span className="italic">empty</span>
                      )}
                      <span className="mx-1">→</span>
                      <span className="text-slate-800">{change.suggestedValue}</span>
                    </p>
                  </div>
                  <div className="flex gap-1">
                    <button
                      type="button"
                      className="rounded-lg p-2 text-emerald-600 hover:bg-emerald-50 disabled:opacity-50"
                      aria-label="Approve suggestion"
                      title="Approve"
                      disabled={busy}
                      onClick={() => resolve("approve", [change.id])}
                    >
                      <Check className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      className="rounded-lg p-2 text-slate-400 hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
                      aria-label="Reject suggestion"
                      title="Reject"
                      disabled={busy}
                      onClick={() => resolve("reject", [change.id])}
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : null}
      </CardBody>
    </Card>
  );
}
