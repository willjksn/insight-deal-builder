"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/Button";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { useProductionDayPage } from "@/hooks/useProductionDayPage";
import { helperHealth, INGEST_HELPER_URL, registerHelperSession } from "@/lib/production/ingestHelper";
import { plannedMedia } from "@/lib/production/capturedFootage";
import {
  PICKUP_REASON_OPTIONS,
  decisionFor,
  markNeedsPickup,
  nextShotId,
  patchTakeReview,
  reviewStateFor,
  reviewUnits,
  setTakeDecision,
} from "@/lib/production/takeReview";
import { PRODUCTION_SHOT_STATUS_LABELS, type ProductionShotMedia, type ProductionShotStatus } from "@/lib/production/types";

export default function TakeReviewPage() {
  const params = useParams();
  const projectId = params.id as string;
  const dayId = params.dayId as string;
  const shotId = params.shotId as string;
  const { user } = useAuth();
  const { board, day, loading, canEditShots, persistDay, persistBoard } = useProductionDayPage(projectId, dayId);
  const [helperToken, setHelperToken] = useState<string | null>(null);
  const [angleId, setAngleId] = useState<string | null>(null);
  const [compare, setCompare] = useState<"captured" | "planned" | "compare">("compare");
  const shot = day?.shots.find((item) => item.id === shotId);
  const groups = board?.takeGroups ?? [];
  const units = useMemo(() => (shot ? reviewUnits(shot, groups) : []), [shot, groups]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const active = units.find((unit) => unit.id === (activeId || units[0]?.id)) || units[0];
  const angle = active?.angles.find((item) => item.clipId === angleId) || active?.angles[0];
  const review = shot && active ? decisionFor(shot, active.id) : undefined;

  useEffect(() => {
    if (!user || !units.some((unit) => unit.angles.some((item) => item.take.metadata?.localProxyPath))) return;
    let cancelled = false;
    void (async () => {
      const health = await helperHealth();
      if (!health.connected || cancelled) return;
      const idToken = await user.getIdToken();
      const res = await fetch(`/api/projects/${projectId}/production/ingest/helper-session`, {
        method: "POST",
        headers: { Authorization: `Bearer ${idToken}`, "Content-Type": "application/json" },
      });
      const data = (await res.json()) as { token?: string; expiresAt?: string };
      if (!res.ok || !data.token || !data.expiresAt || cancelled) return;
      await registerHelperSession(data.token, projectId, data.expiresAt);
      if (!cancelled) setHelperToken(data.token);
    })().catch(() => setHelperToken(null));
    return () => {
      cancelled = true;
    };
  }, [projectId, units, user]);

  if (loading || !day || !board) return <LoadingSpinner className="py-20" />;
  if (!shot) return <p className="p-6 text-sm text-slate-600">That shot is not on this day.</p>;

  const ordered = [...day.shots].sort((a, b) => a.sortOrder - b.sortOrder);
  const previous = nextShotId(ordered, shot.id, "previous", groups);
  const next = nextShotId(ordered, shot.id, "next", groups);
  const unreviewed = nextShotId(ordered, shot.id, "unreviewed", groups);
  const planned = plannedMedia(shot);
  const href = (id: string) => `/projects/${projectId}/production/days/${dayId}/shots/${id}/review`;

  function saveShot(nextShot: typeof shot) {
    if (!nextShot || !canEditShots) return;
    persistDay({ ...day!, shots: day!.shots.map((item) => (item.id === nextShot.id ? nextShot : item)) });
  }

  function savePreferred(kind: "video" | "audio", clipId: string) {
    if (!active) return;
    saveShot(patchTakeReview(shot!, active.id, active.source, kind === "video" ? { preferredVideoClipId: clipId } : { preferredAudioClipId: clipId }));
    if (active.source === "group" && board) {
      persistBoard({
        ...board,
        takeGroups: (board.takeGroups ?? []).map((group) =>
          group.id === active.id
            ? { ...group, ...(kind === "video" ? { preferredVideoClipId: clipId } : { preferredAudioClipId: clipId }), updatedAt: new Date().toISOString() }
            : group
        ),
      });
    }
  }

  return (
    <div className="mx-auto max-w-5xl pb-16">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <div>
          <Link href={`/projects/${projectId}/production/days/${dayId}/shots`} className="text-xs font-semibold text-slate-500">Back to shot list</Link>
          <h1 className="text-2xl font-semibold text-slate-900">{shot.label}</h1>
          <p className="text-sm text-slate-500">{reviewLabel(reviewStateFor(shot, groups))} · Production {PRODUCTION_SHOT_STATUS_LABELS[shot.productionStatus || "planned"]}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {previous ? <Link href={href(previous)}><Button variant="outline">Previous Shot</Button></Link> : <Button variant="outline" disabled>Previous Shot</Button>}
          {next ? <Link href={href(next)}><Button variant="outline">Next Shot</Button></Link> : <Button variant="outline" disabled>Next Shot</Button>}
          {unreviewed ? <Link href={href(unreviewed)}><Button>Next Unreviewed</Button></Link> : <Button disabled>Next Unreviewed</Button>}
        </div>
      </div>

      <div className="mb-3 flex gap-2 text-sm font-semibold">
        {(["planned", "captured", "compare"] as const).map((mode) => (
          <button key={mode} type="button" className={compare === mode ? "text-slate-900" : "text-slate-400"} onClick={() => setCompare(mode)}>
            {mode === "compare" ? "Compare" : mode === "planned" ? "Planned" : "Captured"}
          </button>
        ))}
      </div>

      <div className={`grid gap-4 ${compare === "compare" ? "md:grid-cols-2" : ""}`}>
        {compare !== "captured" ? (
          <section className="rounded-2xl border border-slate-200 p-3">
            <h2 className="text-sm font-semibold text-slate-800">Planned</h2>
            <p className="mt-1 text-sm text-slate-700">{[shot.description, shot.framing, shot.lens, shot.cameraMovement].filter(Boolean).join(" · ") || "No shot description yet."}</p>
            {shot.referenceImageUrl ? <img src={shot.referenceImageUrl} alt="" className="mt-2 max-h-56 w-full rounded-lg object-contain" /> : null}
            {planned.map((item) => (
              <div key={item.id} className="mt-2">
                <p className="text-xs text-slate-500">{item.role === "ai_previs" ? "AI previs" : "Storyboard"}</p>
                {item.mediaType === "video" || item.mimeType?.startsWith("video/") ? <video src={item.url} controls className="mt-1 max-h-56 w-full rounded-lg bg-black" /> : item.url ? <img src={item.url} alt="" className="mt-1 max-h-56 w-full rounded-lg object-contain" /> : null}
              </div>
            ))}
            {!shot.referenceImageUrl && !planned.length ? <p className="mt-2 text-sm text-slate-500">No planned frame yet.</p> : null}
          </section>
        ) : null}
        {compare !== "planned" ? (
          <section className="rounded-2xl border border-slate-200 p-3">
            <h2 className="text-sm font-semibold text-slate-800">Captured</h2>
            {angle ? <Playback take={angle.take} token={helperToken} /> : <p className="mt-2 text-sm text-slate-500">No captured takes on this shot.</p>}
            {active?.source === "group" ? (
              <div className="mt-2 flex flex-wrap gap-2">
                {active.angles.map((item) => (
                  <button key={item.clipId} type="button" className={`rounded-lg px-2 py-1 text-xs font-semibold ${item.clipId === angle?.clipId ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-600"}`} onClick={() => setAngleId(item.clipId)}>
                    {item.label}{item.offsetSeconds ? ` ${item.offsetSeconds > 0 ? "+" : ""}${item.offsetSeconds.toFixed(3)}s` : ""}
                  </button>
                ))}
              </div>
            ) : null}
          </section>
        ) : null}
      </div>

      <div className="mt-4 space-y-3">
        {units.map((unit) => {
          const item = decisionFor(shot, unit.id);
          const selected = unit.id === active?.id;
          return (
            <article key={unit.id} className={`rounded-xl border p-3 ${selected ? "border-slate-900" : "border-slate-200"}`}>
              <button type="button" className="text-sm font-semibold text-slate-900" onClick={() => { setActiveId(unit.id); setAngleId(null); }}>{unit.label}</button>
              <p className="text-xs text-slate-500">{item?.decision || "unreviewed"}{item?.rating ? ` · ${item.rating}/5` : ""}</p>
              {selected && canEditShots ? (
                <div className="mt-2 space-y-2">
                  <div className="flex flex-wrap gap-2">
                    <Button onClick={() => saveShot(setTakeDecision(shot, unit.id, unit.source, "best"))}>Best Take</Button>
                    <Button variant="outline" onClick={() => saveShot(setTakeDecision(shot, unit.id, unit.source, "alternate"))}>Alternate</Button>
                    <Button variant="outline" onClick={() => saveShot(setTakeDecision(shot, unit.id, unit.source, "reject"))}>Reject</Button>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {[1, 2, 3, 4, 5].map((rating) => (
                      <button key={rating} type="button" className="rounded bg-slate-100 px-2 py-1 text-xs font-semibold" onClick={() => saveShot(patchTakeReview(shot, unit.id, unit.source, { rating }))}>{rating}</button>
                    ))}
                  </div>
                  <input className="w-full rounded-lg border border-slate-200 px-2 py-1 text-sm" placeholder="Note" value={item?.note || ""} onChange={(e) => saveShot(patchTakeReview(shot, unit.id, unit.source, { note: e.target.value }))} />
                  {unit.angles.length > 1 ? (
                    <label className="block text-xs text-slate-600">
                      Preferred camera
                      <select className="mt-1 w-full rounded-lg border border-slate-200 px-2 py-1" value={item?.preferredVideoClipId || ""} onChange={(e) => savePreferred("video", e.target.value)}>
                        <option value="">Choose</option>
                        {unit.angles.map((choice) => <option key={choice.clipId} value={choice.clipId}>{choice.label}</option>)}
                      </select>
                    </label>
                  ) : null}
                  {unit.audioChoices.length ? (
                    <label className="block text-xs text-slate-600">
                      Preferred audio
                      <select className="mt-1 w-full rounded-lg border border-slate-200 px-2 py-1" value={item?.preferredAudioClipId || ""} onChange={(e) => savePreferred("audio", e.target.value)}>
                        <option value="">Choose</option>
                        {unit.audioChoices.map((choice) => <option key={choice.clipId} value={choice.clipId}>{choice.label}</option>)}
                      </select>
                    </label>
                  ) : null}
                </div>
              ) : null}
            </article>
          );
        })}
      </div>

      {canEditShots ? (
        <section className="mt-6 space-y-2">
          <p className="text-sm font-semibold text-slate-800">Production status</p>
          <div className="flex flex-wrap gap-2">
            {(["shot", "needs_pickup", "complete"] as ProductionShotStatus[]).map((status) => (
              <Button key={status} variant={shot.productionStatus === status ? "primary" : "outline"} onClick={() => saveShot({ ...shot, productionStatus: status })}>{PRODUCTION_SHOT_STATUS_LABELS[status]}</Button>
            ))}
          </div>
          <div className="space-y-2">
            <Button variant={shot.reviewState === "needs_pickup" ? "primary" : "outline"} onClick={() => saveShot(markNeedsPickup(shot, shot.pickupReason))}>Mark Needs Pickup</Button>
            <div className="flex flex-wrap gap-2">
              {PICKUP_REASON_OPTIONS.map((reason) => (
                <button key={reason} type="button" className="rounded-lg bg-slate-100 px-2 py-1 text-xs font-semibold" onClick={() => saveShot(markNeedsPickup(shot, reason))}>{reason}</button>
              ))}
            </div>
            <input className="w-full rounded-lg border border-slate-200 px-2 py-1 text-sm" placeholder="Pickup notes" value={shot.pickupReason || ""} onChange={(e) => saveShot(markNeedsPickup(shot, e.target.value))} />
          </div>
        </section>
      ) : null}
    </div>
  );
}

function reviewLabel(state: string) {
  if (state === "in_review") return "In Review";
  if (state === "reviewed") return "Reviewed";
  if (state === "needs_pickup") return "Needs Pickup";
  return "Unreviewed";
}

function Playback({ take, token }: { take: ProductionShotMedia; token: string | null }) {
  const proxy = take.metadata?.localProxyPath;
  if (proxy && token) {
    const src = `${INGEST_HELPER_URL}/v1/media/stream?path=${encodeURIComponent(proxy)}&token=${encodeURIComponent(token)}`;
    return <video src={src} controls className="mt-2 max-h-72 w-full rounded-lg bg-black" />;
  }
  const video = take.mediaType === "video" || take.mimeType?.startsWith("video/");
  if (take.url && video) return <video src={take.url} controls className="mt-2 max-h-72 w-full rounded-lg bg-black" />;
  if (take.url) return <img src={take.url} alt="" className="mt-2 max-h-72 w-full rounded-lg object-contain" />;
  return <p className="mt-2 text-sm text-slate-500">Preview is unavailable. The original stays on the drive, and this take has no proxy or browser attachment.</p>;
}
