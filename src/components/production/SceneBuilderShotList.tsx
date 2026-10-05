"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { capturedTakes } from "@/lib/production/capturedFootage";
import type { TakeGroup } from "@/lib/production/ingestTypes";
import { matchesSelect, reviewSummary, type SelectFilter } from "@/lib/production/takeReview";
import { PRODUCTION_SHOT_STATUS_LABELS, type ProductionDayShot } from "@/lib/production/types";
import { CapturedFootagePanel } from "@/components/production/CapturedFootagePanel";

type SyncState = "recent" | "current" | "available" | "missing";

const STATE_LABEL: Record<SyncState, string> = {
  recent: "Updated recently",
  current: "Up to date",
  available: "Update available",
  missing: "Source unavailable",
};

type GetToken = () => Promise<string | null>;

async function authHeaders(getToken: GetToken): Promise<HeadersInit> {
  const token = await getToken();
  if (!token) throw new Error("Not signed in");
  return { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };
}

export function SceneBuilderShotList({
  projectId,
  dayId,
  shots,
  groups = [],
  canEdit,
  getToken,
  onShotsChange,
}: {
  projectId: string;
  dayId: string;
  shots: ProductionDayShot[];
  groups?: TakeGroup[];
  canEdit: boolean;
  getToken: GetToken;
  onShotsChange: (shots: ProductionDayShot[]) => void;
}) {
  const imported = [...shots].sort((a, b) => a.sortOrder - b.sortOrder);
  const linked = imported.filter((shot) => shot.sourceSceneId && shot.sourceShotId);
  const [openId, setOpenId] = useState<string | null>(null);
  const [states, setStates] = useState<Record<string, SyncState>>({});
  const [busyId, setBusyId] = useState<string | null>(null);
  const [report, setReport] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch(`/api/projects/${projectId}/production/sync-from-scene`, {
          headers: await authHeaders(getToken),
        });
        if (!res.ok) return;
        const data = (await res.json()) as { shots?: { id: string; state: SyncState }[] };
        if (cancelled) return;
        setStates(Object.fromEntries((data.shots ?? []).map((shot) => [shot.id, shot.state])));
      } catch {
        /* The manual update still works if the status check fails. */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [projectId, getToken, shots]);

  if (!imported.length) return null;

  const summary = reviewSummary(imported, groups);
  const filters: { key: SelectFilter; label: string }[] = [
    { key: "best", label: "Best Takes" },
    { key: "alternate", label: "Alternates" },
    { key: "rejected", label: "Rejected" },
    { key: "pickup", label: "Needs Pickup" },
    { key: "unreviewed", label: "Unreviewed" },
  ];

  function changeShot(next: ProductionDayShot) {
    onShotsChange(shots.map((shot) => (shot.id === next.id ? next : shot)));
  }

  async function update(productionShotId?: string) {
    setBusyId(productionShotId || "all");
    setReport(null);
    try {
      const res = await fetch(`/api/projects/${projectId}/production/sync-from-scene`, {
        method: "POST",
        headers: await authHeaders(getToken),
        body: JSON.stringify(productionShotId ? { productionShotId } : {}),
      });
      const data = (await res.json()) as {
        error?: string;
        updated?: string[];
        current?: string[];
        missing?: string[];
        failed?: { id: string; error: string }[];
      };
      if (!res.ok) throw new Error(data.error || "Could not update");
      const parts = [
        data.updated?.length ? `${data.updated.length} updated` : "",
        data.current?.length ? `${data.current.length} already current` : "",
        data.missing?.length ? `${data.missing.length} source missing` : "",
        data.failed?.length ? `${data.failed.length} failed` : "",
      ].filter(Boolean);
      setReport(parts.join(" · ") || "No linked shots");
    } catch (err) {
      setReport(err instanceof Error ? err.message : "Could not update");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-semibold text-slate-900">Shot list</h2>
          <p className="mt-0.5 text-xs text-slate-500">Open Footage to add takes. Scene Builder updates do not replace captured clips.</p>
        </div>
        {canEdit && linked.length ? (
          <button
            type="button"
            className="text-sm font-semibold text-sky-800 disabled:text-slate-400"
            disabled={Boolean(busyId)}
            onClick={() => void update()}
          >
            {busyId === "all" ? "Updating…" : "Update all from Scene Builder"}
          </button>
        ) : null}
      </div>
      {report ? <p className="mt-2 text-sm text-slate-600">{report}</p> : null}
      <p className="mt-3 text-xs text-slate-500">
        {summary.planned} planned · {summary.reviewed} reviewed · {summary.best} best takes · {summary.pickup} need pickup · {summary.unreviewed} unreviewed
      </p>
      <div className="mt-3 grid gap-2 sm:grid-cols-5">
        {filters.map(({ key, label }) => {
          const matched = imported.filter((shot) => matchesSelect(shot, key, groups));
          return (
          <div key={key} className="rounded-xl border border-slate-200 px-3 py-2">
            <p className="text-xs font-semibold text-slate-500">{label} · {matched.length}</p>
            {matched.slice(0, 4).map((shot) => (
              <Link key={shot.id} href={`/projects/${projectId}/production/days/${dayId}/shots/${shot.id}/review`} className="mt-1 block truncate text-xs text-sky-800">
                {shot.label}
                {shot.pickupReason && key === "pickup" ? ` · ${shot.pickupReason}` : ""}
              </Link>
            ))}
          </div>
          );
        })}
      </div>
      <ul className="mt-4 space-y-3">
        {imported.map((shot, index) => {
          const preview =
            shot.referenceImageUrl ||
            shot.media?.find((item) => item.role === "planned_reference" || item.role === "ai_previs")?.url;
          const state = shot.sourceSceneId ? (shot.sourceUnavailable ? "missing" : states[shot.id]) : undefined;
          const clipCount = capturedTakes(shot).length;
          const open = openId === shot.id;
          return (
            <li key={shot.id} className="rounded-xl border border-slate-200 p-3">
              <div className="flex gap-3">
              {preview ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={preview} alt="" className="h-16 w-24 rounded-lg object-cover bg-slate-100" />
              ) : (
                <div className="flex h-16 w-24 items-center justify-center rounded-lg bg-slate-100 text-[11px] text-slate-400">
                  No preview
                </div>
              )}
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-slate-900">
                  {String(index + 1).padStart(2, "0")} · {shot.label}
                </p>
                <p className="mt-0.5 text-xs text-slate-500">
                  {[shot.framing, shot.lens, shot.cameraMovement].filter(Boolean).join(" · ") || "No camera notes"}
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  {shot.productionStatus ? PRODUCTION_SHOT_STATUS_LABELS[shot.productionStatus] : "Planned"}
                  {shot.sourceSceneTitle ? ` · ${shot.sourceSceneTitle}` : ""}
                  {state ? ` · ${STATE_LABEL[state]}` : ""}
                  {` · ${clipCount} clip${clipCount === 1 ? "" : "s"}`}
                </p>
              </div>
              <Link href={`/projects/${projectId}/production/days/${dayId}/shots/${shot.id}/review`} className="shrink-0 self-center text-xs font-semibold text-sky-800">
                Review Takes
              </Link>
              <button type="button" className="shrink-0 self-center text-xs font-semibold text-slate-600" onClick={() => setOpenId(open ? null : shot.id)}>
                {open ? "Hide footage" : "Footage"}
              </button>
              {canEdit && shot.sourceShotId ? (
                <button
                  type="button"
                  className="shrink-0 self-center text-xs font-semibold text-slate-600 disabled:text-slate-300"
                  disabled={Boolean(busyId) || state === "missing"}
                  onClick={() => void update(shot.id)}
                >
                  {busyId === shot.id ? "Updating…" : "Update"}
                </button>
              ) : null}
              </div>
              {open ? (
                <CapturedFootagePanel projectId={projectId} shot={shot} readOnly={!canEdit} onChange={changeShot} />
              ) : null}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
