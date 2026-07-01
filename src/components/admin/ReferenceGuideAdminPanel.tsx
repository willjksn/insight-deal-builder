"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2, RefreshCw, Check, X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card, CardBody } from "@/components/ui/Card";
import { ReferenceGuideView } from "@/components/reference/ReferenceGuideView";
import { ReferenceGuideDocument, ReferenceGuideDraft } from "@/lib/reference/types";
import { useAuth } from "@/contexts/AuthContext";

export function ReferenceGuideAdminPanel() {
  const { user } = useAuth();
  const [published, setPublished] = useState<ReferenceGuideDocument | null>(null);
  const [draft, setDraft] = useState<ReferenceGuideDraft | null>(null);
  const [loading, setLoading] = useState(true);
  const [researching, setResearching] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [focusNote, setFocusNote] = useState("");
  const [previewDraft, setPreviewDraft] = useState(false);

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/reference/admin", {
        headers: { Authorization: `Bearer ${await user.getIdToken()}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? res.statusText);
      setPublished(data.published);
      setDraft(data.draft ?? null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    void load();
  }, [load]);

  const research = async () => {
    if (!user) return;
    setResearching(true);
    setError(null);
    try {
      const res = await fetch("/api/reference/admin", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${await user.getIdToken()}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ focusNote: focusNote.trim() || undefined }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? res.statusText);
      setPublished(data.published);
      setDraft(data.draft ?? null);
      setPreviewDraft(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Research failed");
    } finally {
      setResearching(false);
    }
  };

  const publish = async () => {
    if (!user) return;
    setPublishing(true);
    setError(null);
    try {
      const res = await fetch("/api/reference/publish", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${await user.getIdToken()}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ action: "publish" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? res.statusText);
      setPublished(data.published);
      setDraft(null);
      setPreviewDraft(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Publish failed");
    } finally {
      setPublishing(false);
    }
  };

  const discard = async () => {
    if (!user) return;
    setError(null);
    try {
      const res = await fetch("/api/reference/publish", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${await user.getIdToken()}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ action: "discard" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? res.statusText);
      setDraft(null);
      setPreviewDraft(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Discard failed");
    }
  };

  const previewGuide: ReferenceGuideDocument | null =
    previewDraft && draft
      ? {
          ...(published ?? { version: 1, title: "", subtitle: "", sections: [] }),
          sections: draft.sections,
          updatedAt: draft.researchedAt,
        }
      : published;

  return (
    <Card className="mb-8">
      <CardBody className="space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="font-semibold text-slate-900">Reference guide updates</h2>
            <p className="text-sm text-slate-500">
              Gemini + web research proposes a draft — review before publishing to all users.
            </p>
          </div>
          <Button type="button" size="sm" variant="outline" onClick={() => void load()}>
            Refresh
          </Button>
        </div>

        {error && (
          <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
        )}

        {draft && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
            <p className="font-medium">Draft pending review</p>
            <p className="mt-1 text-xs">{draft.changeSummary}</p>
            <p className="mt-1 text-xs text-amber-800">
              Researched {new Date(draft.researchedAt).toLocaleString()} · {draft.sections.length} sections
            </p>
          </div>
        )}

        <textarea
          value={focusNote}
          onChange={(e) => setFocusNote(e.target.value)}
          placeholder="Optional focus for research (e.g. FX6 firmware, new LED flicker tips…)"
          rows={2}
          className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-sky-400"
        />

        <div className="flex flex-wrap gap-2">
          <Button type="button" disabled={researching} onClick={() => void research()}>
            {researching ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="mr-2 h-4 w-4" />
            )}
            Research updates
          </Button>
          {draft && (
            <>
              <Button
                type="button"
                variant="outline"
                onClick={() => setPreviewDraft((p) => !p)}
              >
                {previewDraft ? "Hide draft preview" : "Preview draft"}
              </Button>
              <Button type="button" disabled={publishing} onClick={() => void publish()}>
                {publishing ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Check className="mr-2 h-4 w-4" />
                )}
                Publish draft
              </Button>
              <Button type="button" variant="ghost" onClick={() => void discard()}>
                <X className="mr-2 h-4 w-4" />
                Discard draft
              </Button>
            </>
          )}
        </div>

        {previewDraft && previewGuide && (
          <div className="border-t border-slate-100 pt-6">
            <ReferenceGuideView guide={previewGuide} loading={loading} />
          </div>
        )}
      </CardBody>
    </Card>
  );
}
