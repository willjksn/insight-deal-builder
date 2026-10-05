"use client";

import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { helperHealth, INGEST_HELPER_URL, registerHelperSession } from "@/lib/production/ingestHelper";
import { uploadProductionFootage } from "@/lib/production/storage";
import {
  appendCapturedTake,
  capturedTakes,
  plannedMedia,
  selectCapturedTake,
  unlinkCapturedTake,
  updateCapturedTake,
} from "@/lib/production/capturedFootage";
import { PRODUCTION_SHOT_STATUS_LABELS, type ProductionDayShot, type ProductionShotStatus } from "@/lib/production/types";

export function CapturedFootagePanel({
  projectId,
  shot,
  readOnly,
  onChange,
}: {
  projectId: string;
  shot: ProductionDayShot;
  readOnly?: boolean;
  onChange: (next: ProductionDayShot) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [helperToken, setHelperToken] = useState<string | null>(null);
  const { user } = useAuth();
  const takes = capturedTakes(shot);
  const needsProxy = takes.some((take) => take.metadata?.localProxyPath);

  useEffect(() => {
    if (!needsProxy || !user) return;
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
  }, [needsProxy, projectId, user]);
  const planned = plannedMedia(shot);

  async function onFiles(list: FileList | null) {
    if (!list?.length) return;
    setUploading(true);
    setError(null);
    try {
      let next = shot;
      for (const file of Array.from(list)) {
        const id = crypto.randomUUID();
        const uploaded = await uploadProductionFootage(projectId, shot.id, id, file);
        const number = capturedTakes(next).length + 1;
        next = appendCapturedTake(next, {
          id,
          role: "captured_footage",
          url: uploaded.storageUrl,
          storagePath: uploaded.storagePath,
          fileName: uploaded.fileName,
          mimeType: uploaded.mimeType,
          mediaType: uploaded.mimeType.startsWith("video/") ? "video" : "image",
          projectId,
          productionShotId: shot.id,
          createdAt: new Date().toISOString(),
          takeNumber: number,
          label: `Take ${number}`,
        });
      }
      onChange(next);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="mt-3 space-y-3 border-t border-slate-100 pt-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Captured footage</p>
        {readOnly ? null : (
          <button type="button" className="text-xs font-semibold text-sky-800" disabled={uploading} onClick={() => inputRef.current?.click()}>
            {uploading ? "Uploading…" : "Add footage"}
          </button>
        )}
      </div>
      {error ? <p className="text-xs text-red-700">{error}</p> : null}
      {takes.length && !readOnly ? (
        <div className="flex flex-wrap gap-2">
          {(["shot", "needs_pickup", "complete"] as ProductionShotStatus[]).map((status) => (
            <button
              key={status}
              type="button"
              className="rounded-md bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-700"
              onClick={() => onChange({ ...shot, productionStatus: status })}
            >
              {PRODUCTION_SHOT_STATUS_LABELS[status]}
            </button>
          ))}
        </div>
      ) : null}
      <div className="grid gap-3 md:grid-cols-2">
        <div>
          <p className="mb-1 text-xs text-slate-500">Planned / previs</p>
          {planned.length ? (
            <div className="flex gap-2 overflow-x-auto">
              {planned.map((item) =>
                item.mimeType?.startsWith("video/") || item.label === "AI motion" ? (
                  <video key={item.id} src={item.url} controls className="h-24 w-36 rounded-lg bg-black object-contain" />
                ) : (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img key={item.id} src={item.url} alt={item.label || "Planned"} className="h-24 w-36 rounded-lg object-cover" />
                )
              )}
            </div>
          ) : (
            <p className="text-xs text-slate-400">No planned frame yet.</p>
          )}
        </div>
        <div className="space-y-2">
          <p className="text-xs text-slate-500">Captured</p>
          {takes.length === 0 ? <p className="text-xs text-slate-400">No captured clips yet.</p> : null}
          {takes.map((take) => {
            const video = take.mediaType === "video" || take.mimeType?.startsWith("video/");
            const proxyPath = take.metadata?.localProxyPath;
            const proxySrc = proxyPath && helperToken
              ? `${INGEST_HELPER_URL}/v1/media/stream?path=${encodeURIComponent(proxyPath)}&token=${encodeURIComponent(helperToken)}`
              : "";
            return (
              <div key={take.id} className={`rounded-lg border p-2 ${take.preferred ? "border-sky-400 bg-sky-50" : "border-slate-200"}`}>
                {proxySrc ? (
                  <video src={proxySrc} controls className="mb-2 h-24 w-full rounded bg-black object-contain" />
                ) : take.url && video ? (
                  <video src={take.url} controls className="mb-2 h-24 w-full rounded bg-black object-contain" />
                ) : take.url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={take.url} alt={take.fileName || "Take"} className="mb-2 h-24 w-full rounded object-cover" />
                ) : (
                  <p className="mb-2 text-xs text-slate-500">Original stays on the source drive. No preview file is stored.</p>
                )}
                {proxyPath ? <p className="text-xs text-slate-500">Proxy{take.metadata?.localOriginalPath ? " · Original stays on the drive" : ""}</p> : null}
                <p className="text-xs font-semibold text-slate-800">
                  {take.preferred ? "Selected take · " : ""}
                  {take.fileName || take.label || "Clip"}
                </p>
                {readOnly ? (
                  <p className="text-xs text-slate-500">
                    {[take.takeNumber ? `Take ${take.takeNumber}` : "", take.camera, take.rating ? `${take.rating}/5` : "", take.notes]
                      .filter(Boolean)
                      .join(" · ")}
                  </p>
                ) : (
                  <div className="mt-2 grid gap-1">
                    <div className="flex gap-1">
                      <input
                        className="w-16 rounded border border-slate-200 px-1 py-0.5 text-xs"
                        type="number"
                        min={1}
                        placeholder="Take"
                        value={take.takeNumber ?? ""}
                        onChange={(e) =>
                          onChange(updateCapturedTake(shot, take.id, { takeNumber: e.target.value ? Number(e.target.value) : null }))
                        }
                      />
                      <input
                        className="min-w-0 flex-1 rounded border border-slate-200 px-1 py-0.5 text-xs"
                        placeholder="Camera"
                        value={take.camera || ""}
                        onChange={(e) => onChange(updateCapturedTake(shot, take.id, { camera: e.target.value }))}
                      />
                      <select
                        className="rounded border border-slate-200 px-1 py-0.5 text-xs"
                        value={take.rating ?? ""}
                        onChange={(e) =>
                          onChange(updateCapturedTake(shot, take.id, { rating: e.target.value ? Number(e.target.value) : null }))
                        }
                      >
                        <option value="">Rating</option>
                        {[1, 2, 3, 4, 5].map((n) => (
                          <option key={n} value={n}>
                            {n}/5
                          </option>
                        ))}
                      </select>
                    </div>
                    <input
                      className="rounded border border-slate-200 px-1 py-0.5 text-xs"
                      placeholder="Notes"
                      value={take.notes || ""}
                      onChange={(e) => onChange(updateCapturedTake(shot, take.id, { notes: e.target.value }))}
                    />
                    <div className="flex gap-3 text-xs font-semibold">
                      <button type="button" className="text-sky-800" onClick={() => onChange(selectCapturedTake(shot, take.id))}>
                        Select take
                      </button>
                      <button type="button" className="text-slate-500" onClick={() => onChange(unlinkCapturedTake(shot, take.id))}>
                        Remove attachment
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="video/*,image/*"
        multiple
        className="hidden"
        onChange={(e) => {
          const files = e.target.files;
          e.target.value = "";
          void onFiles(files);
        }}
      />
    </div>
  );
}
