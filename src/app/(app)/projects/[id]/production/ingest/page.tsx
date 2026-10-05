"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { TakeMatchingPanel } from "@/components/production/TakeMatchingPanel";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { useAuth } from "@/contexts/AuthContext";
import { useDocument } from "@/hooks/useDocument";
import { ensureProductionBoard, saveProductionBoard } from "@/lib/firebase/productionFirestore";
import { uploadProductionImage } from "@/lib/production/storage";
import { assignIngestClips, clipDestinationPath, ingestDestinationFolder, productionProxyPath, suggestShotForClip } from "@/lib/production/ingest";
import {
  applyHelperJob,
  helperDrives,
  helperHealth,
  helperIndex,
  helperJob,
  helperQueueProxies,
  helperStartJob,
  INGEST_HELPER_URL,
  registerHelperSession,
  type HelperDrive,
  type HelperJob,
} from "@/lib/production/ingestHelper";
import {
  INGEST_CAMERA_BODY_EXAMPLES,
  INGEST_CAMERA_LABELS,
  INGEST_CAMERA_SLOTS,
  INGEST_COPY_LABELS,
  INGEST_SOURCE_KINDS,
  INGEST_SOURCE_LABELS,
  type IngestCameraSlot,
  type IngestSourceKind,
  type ProductionIngestClip,
  type ProductionIngestSession,
} from "@/lib/production/ingestTypes";
import type { ProductionBoard, ProductionDayShot } from "@/lib/production/types";
import type { Project } from "@/lib/types";

const STEPS = ["Source", "Camera", "Destination", "Scan", "Copy / verify", "Metadata", "Shot assignment"] as const;
const VIDEO_EXT = /\.(mp4|mov|mxf|braw|r3d|insv|webm|m4v)$/i;
const PLAYABLE_EXT = /\.(mp4|mov|webm|m4v)$/i;

type DirHandle = {
  entries: () => AsyncIterable<[string, { kind: string; getFile?: () => Promise<File>; entries?: DirHandle["entries"] }]>;
};

export default function ProductionIngestPage() {
  const params = useParams();
  const projectId = params.id as string;
  const { user } = useAuth();
  const { data: project, loading } = useDocument<Project>("projects", projectId);
  const [board, setBoard] = useState<ProductionBoard | null>(null);
  const [step, setStep] = useState(0);
  const [sourceKind, setSourceKind] = useState<IngestSourceKind>("cfexpress");
  const [sourceLabel, setSourceLabel] = useState("");
  const [cardName, setCardName] = useState("A001");
  const [cameraSlot, setCameraSlot] = useState<IngestCameraSlot>("A");
  const [cameraBody, setCameraBody] = useState("");
  const [destinationPath, setDestinationPath] = useState(ingestDestinationFolder("A"));
  const [session, setSession] = useState<ProductionIngestSession | null>(null);
  const [selected, setSelected] = useState<string[]>([]);
  const [shotId, setShotId] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [helperConnected, setHelperConnected] = useState(false);
  const [helperToken, setHelperToken] = useState<string | null>(null);
  const [drives, setDrives] = useState<HelperDrive[]>([]);
  const [sourceRoot, setSourceRoot] = useState("");
  const [destRoot, setDestRoot] = useState("");
  const [jobProgress, setJobProgress] = useState<HelperJob | null>(null);
  const [generateProxies, setGenerateProxies] = useState(true);

  const connectHelper = useCallback(async () => {
    const health = await helperHealth();
    if (!health.connected || !user) {
      setHelperConnected(false);
      setHelperToken(null);
      return;
    }
    const idToken = await user.getIdToken();
    const res = await fetch(`/api/projects/${projectId}/production/ingest/helper-session`, {
      method: "POST",
      headers: { Authorization: `Bearer ${idToken}`, "Content-Type": "application/json" },
    });
    const data = (await res.json()) as { token?: string; expiresAt?: string; error?: string };
    if (!res.ok || !data.token || !data.expiresAt) {
      setHelperConnected(false);
      return;
    }
    await registerHelperSession(data.token, projectId, data.expiresAt);
    setHelperToken(data.token);
    setHelperConnected(true);
    setDrives(await helperDrives(data.token));
  }, [projectId, user]);

  useEffect(() => {
    void connectHelper().catch(() => setHelperConnected(false));
  }, [connectHelper]);

  useEffect(() => {
    if (!project || !user) return;
    void ensureProductionBoard(project, user.uid).then(setBoard).catch((err) => {
      setError(err instanceof Error ? err.message : "Could not open the production board");
    });
  }, [project, user]);

  const shots = useMemo(() => {
    const list: ProductionDayShot[] = [];
    for (const day of board?.productionDays ?? []) list.push(...(day.shots ?? []));
    return list;
  }, [board]);

  const saveSession = useCallback(
    async (next: ProductionIngestSession) => {
      if (!board) return;
      const others = (board.ingestSessions ?? []).filter((item) => item.id !== next.id);
      const ingestSessions = [next, ...others];
      await saveProductionBoard(board.id, { ingestSessions });
      setBoard({ ...board, ingestSessions });
      setSession(next);
    },
    [board]
  );

  async function scanSource() {
    setBusy(true);
    setError(null);
    try {
      const found = await readSourceClips();
      if (!found.length) {
        setError("No camera clips were found in that folder.");
        return;
      }
      const sessionId = crypto.randomUUID();
      const clips: ProductionIngestClip[] = [];
      for (const file of found) {
        const probed = PLAYABLE_EXT.test(file.name) ? await probePlayableClip(file.file) : {};
        let thumbnailUrl: string | undefined;
        let thumbnailPath: string | undefined;
        if (probed.thumbnail) {
          try {
            const uploaded = await uploadProductionImage(projectId, `ingest/${sessionId}`, crypto.randomUUID(), probed.thumbnail);
            thumbnailUrl = uploaded.storageUrl;
            thumbnailPath = uploaded.storagePath;
          } catch {
            thumbnailUrl = undefined;
          }
        }
        const clip: ProductionIngestClip = {
          id: crypto.randomUUID(),
          filename: file.name,
          originalFilename: file.name,
          cameraSlot,
          cameraBody: cameraBody.trim() || undefined,
          sourceCard: cardName.trim() || undefined,
          sourcePath: file.path,
          destinationPath: clipDestinationPath({ destinationPath }, file.name),
          durationSeconds: probed.durationSeconds,
          resolution: probed.resolution,
          sizeBytes: file.size,
          recordedAt: new Date(file.lastModified).toISOString(),
          timeSource: "filesystem",
          copyStatus: "waiting",
          verificationStatus: "waiting",
          proxyStatus: "none",
          thumbnailUrl,
          thumbnailPath,
        };
        const suggestion = suggestShotForClip(clip, shots);
        clips.push(suggestion ? { ...clip, suggestedShotId: suggestion.shotId, suggestionReason: suggestion.reason } : clip);
      }
      const created: ProductionIngestSession = {
        id: sessionId,
        projectId,
        sourceKind,
        sourceLabel: sourceLabel.trim() || INGEST_SOURCE_LABELS[sourceKind],
        cardName: cardName.trim(),
        cameraSlot,
        cameraBody: cameraBody.trim(),
        destinationPath,
        createdAt: new Date().toISOString(),
        copyCapability: "metadata_only",
        clips,
      };
      await saveSession(created);
      setStep(4);
      setNotice(`${created.clips.length} clips indexed. Originals were not uploaded.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not read the source folder");
    } finally {
      setBusy(false);
    }
  }

  async function scanWithHelper() {
    if (!helperToken || !sourceRoot.trim()) return;
    setBusy(true);
    setError(null);
    try {
      const found = await helperIndex(helperToken, sourceRoot.trim());
      if (!found.length) {
        setError("No camera clips were found in that folder.");
        return;
      }
      const root = destRoot.trim();
      const clips: ProductionIngestClip[] = found.map((file) => {
        const relative = file.path.slice(sourceRoot.trim().length).replace(/^[/\\]/, "");
        const clip: ProductionIngestClip = {
          id: crypto.randomUUID(),
          filename: file.filename,
          originalFilename: file.filename,
          cameraSlot,
          cameraBody: cameraBody.trim() || undefined,
          sourceCard: cardName.trim() || undefined,
          sourcePath: relative,
          localSourcePath: file.path,
          destinationPath: clipDestinationPath({ destinationPath }, relative),
          localDestinationPath: root ? joinLocal(root, destinationPath, relative) : undefined,
          sizeBytes: file.sizeBytes,
          recordedAt: file.mtimeMs ? new Date(file.mtimeMs).toISOString() : undefined,
          copyStatus: "waiting",
          verificationStatus: "waiting",
          proxyStatus: "none",
        };
        const suggestion = suggestShotForClip(clip, shots);
        return suggestion ? { ...clip, suggestedShotId: suggestion.shotId, suggestionReason: suggestion.reason } : clip;
      });
      const created: ProductionIngestSession = {
        id: crypto.randomUUID(),
        projectId,
        sourceKind,
        sourceLabel: sourceLabel.trim() || INGEST_SOURCE_LABELS[sourceKind],
        cardName: cardName.trim(),
        cameraSlot,
        cameraBody: cameraBody.trim(),
        destinationPath,
        localDestinationRoot: root || undefined,
        localSourceRoot: sourceRoot.trim(),
        createdAt: new Date().toISOString(),
        generateProxiesAfterVerify: generateProxies,
        copyCapability: "local_helper",
        clips,
      };
      await saveSession(created);
      setStep(4);
      setNotice(`${created.clips.length} clips indexed on this computer. Originals were not uploaded.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not scan with the local helper");
    } finally {
      setBusy(false);
    }
  }

  async function startHelperCopy() {
    if (!helperToken || !session) return;
    const files = session.clips
      .filter((clip) => clip.localSourcePath && clip.localDestinationPath && clip.copyStatus !== "verified")
      .map((clip) => ({ id: clip.id, sourcePath: clip.localSourcePath as string, destPath: clip.localDestinationPath as string }));
    if (!files.length) {
      setError("Choose a destination folder before copying. Each clip needs a local destination path.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const started = await helperStartJob(helperToken, files, generateProxies);
      setJobProgress(started);
      setNotice("Copy started. You can leave this page; the helper keeps working on this computer.");
      const poll = window.setInterval(async () => {
        try {
          const job = await helperJob(helperToken, started.id);
          setJobProgress(job);
          const next = applyHelperJob(session, job);
          setSession(next);
          const proxiesBusy = next.clips.some((clip) => clip.proxyStatus === "queued" || clip.proxyStatus === "generating");
          if (job.status === "complete" && !proxiesBusy) {
            window.clearInterval(poll);
            await saveSession(next);
            setBusy(false);
            setNotice("Copy job finished. Verified clips can be assigned to shots.");
          }
        } catch (err) {
          window.clearInterval(poll);
          setBusy(false);
          setError(err instanceof Error ? err.message : "Lost contact with the local helper");
        }
      }, 1000);
    } catch (err) {
      setBusy(false);
      setError(err instanceof Error ? err.message : "Could not start the copy");
    }
  }

  async function queueProxyClips(onlyFailed: boolean) {
    if (!helperToken || !session) return;
    const targets = session.clips.filter((clip) => {
      if (clip.copyStatus !== "verified" || !clip.localDestinationPath) return false;
      return onlyFailed ? clip.proxyStatus === "failed" : clip.proxyStatus !== "ready";
    });
    if (!targets.length) {
      setNotice(onlyFailed ? "No failed proxies to retry." : "No verified clips are waiting for a proxy.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const started = await helperQueueProxies(
        helperToken,
        targets.map((clip) => ({
          id: clip.id,
          originalPath: clip.localDestinationPath as string,
          proxyPath: productionProxyPath(clip.localDestinationPath as string, clip.id),
          durationSeconds: clip.durationSeconds,
        }))
      );
      const poll = window.setInterval(async () => {
        try {
          const job = await helperJob(helperToken, started.id);
          const next = applyHelperJob(session, job);
          setSession(next);
          const busyProxy = next.clips.some((clip) => clip.proxyStatus === "queued" || clip.proxyStatus === "generating");
          if (job.status === "complete" && !busyProxy) {
            window.clearInterval(poll);
            await saveSession(next);
            setBusy(false);
          }
        } catch (err) {
          window.clearInterval(poll);
          setBusy(false);
          setError(err instanceof Error ? err.message : "Proxy job lost contact with the helper");
        }
      }, 1000);
    } catch (err) {
      setBusy(false);
      setError(err instanceof Error ? err.message : "Could not queue proxies");
    }
  }

  async function assign(target: string | null) {
    if (!board || !session || !selected.length) return;
    setBusy(true);
    setError(null);
    try {
      const result = assignIngestClips(board.productionDays, session, selected, target);
      await saveProductionBoard(board.id, { productionDays: result.days, ingestSessions: [result.session, ...(board.ingestSessions ?? []).filter((item) => item.id !== session.id)] });
      setBoard({ ...board, productionDays: result.days, ingestSessions: [result.session, ...(board.ingestSessions ?? []).filter((item) => item.id !== session.id)] });
      setSession(result.session);
      setSelected([]);
      setNotice(target ? "Clips attached to the shot as captured takes." : "Clips left unassigned.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not assign clips");
    } finally {
      setBusy(false);
    }
  }

  if (loading || !project || !board) return <LoadingSpinner className="py-20" />;

  return (
    <div className="mx-auto max-w-3xl pb-16">
      <PageHeader
        title="Ingest Media"
        subtitle="Index camera clips and attach them to shots. Full-resolution originals stay on the drive you select."
        action={
          <Link href={`/projects/${projectId}/production`}>
            <Button variant="outline">Back to board</Button>
          </Link>
        }
      />
      <ol className="mb-6 flex flex-wrap gap-2 text-xs font-semibold text-slate-500">
        {STEPS.map((label, index) => (
          <li key={label}>
            <button type="button" className={index === step ? "text-slate-900" : ""} onClick={() => setStep(index)}>
              {index + 1}. {label}
            </button>
          </li>
        ))}
      </ol>
      <p className={`mb-4 text-sm font-semibold ${helperConnected ? "text-emerald-800" : "text-slate-500"}`}>
        {helperConnected ? "Local Helper Connected" : "Local Helper Not Connected"}
        {helperConnected ? "" : " — folder scan still works. Copy and checksum need the desktop agent on this computer."}
      </p>
      {error ? <p className="mb-4 text-sm text-red-700">{error}</p> : null}
      {notice ? <p className="mb-4 text-sm text-sky-900">{notice}</p> : null}

      {step === 0 ? (
        <section className="space-y-3">
          <p className="text-sm text-slate-600">Choose the kind of source. The files themselves are read from a folder on this computer.</p>
          <div className="flex flex-wrap gap-2">
            {INGEST_SOURCE_KINDS.map((kind) => (
              <button key={kind} type="button" className={`rounded-lg px-3 py-1.5 text-sm font-semibold ${sourceKind === kind ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-600"}`} onClick={() => setSourceKind(kind)}>
                {INGEST_SOURCE_LABELS[kind]}
              </button>
            ))}
          </div>
          <Input label="Source label" value={sourceLabel} placeholder={INGEST_SOURCE_LABELS[sourceKind]} onChange={(e) => setSourceLabel(e.target.value)} />
          {helperConnected ? (
            <div className="space-y-2">
              <p className="text-sm text-slate-600">Pick a card, folder, or drive. Letters come from this computer, not a fixed list.</p>
              <div className="flex flex-wrap gap-2">
                {drives.map((drive) => (
                  <button key={drive.path} type="button" className={`rounded-lg px-3 py-1.5 text-left text-sm ${sourceRoot === drive.path ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-700"}`} onClick={() => setSourceRoot(drive.path)}>
                    <span className="block font-semibold">{drive.volumeLabel || drive.label}</span>
                    <span className="block text-xs opacity-80">{drive.path}{formatSpace(drive)}</span>
                  </button>
                ))}
              </div>
              <Input label="Source folder" value={sourceRoot} onChange={(e) => setSourceRoot(e.target.value)} />
            </div>
          ) : null}
          <Button onClick={() => setStep(1)}>Continue</Button>
        </section>
      ) : null}

      {step === 1 ? (
        <section className="space-y-3">
          <div className="flex flex-wrap gap-2">
            {INGEST_CAMERA_SLOTS.map((slot) => (
              <button key={slot} type="button" className={`rounded-lg px-3 py-1.5 text-sm font-semibold ${cameraSlot === slot ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-600"}`} onClick={() => { setCameraSlot(slot); setDestinationPath(ingestDestinationFolder(slot)); }}>
                {INGEST_CAMERA_LABELS[slot]}
              </button>
            ))}
          </div>
          <Input label="Camera body" value={cameraBody} placeholder={INGEST_CAMERA_BODY_EXAMPLES.join(", ")} onChange={(e) => setCameraBody(e.target.value)} />
          <Input label="Card name" value={cardName} onChange={(e) => setCardName(e.target.value)} />
          <Button onClick={() => setStep(2)}>Continue</Button>
        </section>
      ) : null}

      {step === 2 ? (
        <section className="space-y-3">
          <p className="text-sm text-slate-600">This is a path under the project media root, using the existing original-media folders. Nothing is copied yet.</p>
          <Input label="Destination reference" value={destinationPath} onChange={(e) => setDestinationPath(e.target.value)} />
          {helperConnected ? (
            <div className="space-y-2">
              <p className="text-sm text-slate-600">Choose the drive or folder that should receive the originals. The reference above is created under that folder.</p>
              <div className="flex flex-wrap gap-2">
                {drives.map((drive) => (
                  <button key={drive.path} type="button" className={`rounded-lg px-3 py-1.5 text-left text-sm ${destRoot === drive.path ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-700"}`} onClick={() => setDestRoot(drive.path)}>
                    <span className="block font-semibold">{drive.volumeLabel || drive.label}</span>
                    <span className="block text-xs opacity-80">{drive.path}{formatSpace(drive)}</span>
                  </button>
                ))}
              </div>
              <Input label="Destination drive or folder" value={destRoot} onChange={(e) => setDestRoot(e.target.value)} />
            </div>
          ) : null}
          <Button onClick={() => setStep(3)}>Continue</Button>
        </section>
      ) : null}

      {step === 3 ? (
        <section className="space-y-3">
          <p className="text-sm text-slate-600">Pick the card or folder. ShootSpine reads names, sizes, and dates. It does not upload the camera files.</p>
          {helperConnected ? (
            <Button disabled={busy || !sourceRoot.trim()} onClick={() => void scanWithHelper()}>{busy ? "Scanning…" : "Scan with local helper"}</Button>
          ) : (
            <Button disabled={busy} onClick={() => void scanSource()}>{busy ? "Reading…" : "Choose source folder"}</Button>
          )}
        </section>
      ) : null}

      {step === 4 ? (
        <section className="space-y-3">
          {helperConnected ? (
            <>
              <p className="text-sm text-slate-700">The helper copies each clip, then checksums the source and the destination. The source card is not changed. A matching file is skipped. A different file with the same name becomes a conflict and is not overwritten.</p>
              {jobProgress ? (
                <p className="text-sm text-slate-800">
                  {jobProgress.filesCompleted}/{jobProgress.totalFiles} files · {formatGb(jobProgress.bytesCopied)} / {formatGb(jobProgress.totalBytes)} GB
                  {jobProgress.currentFile ? ` · ${jobProgress.currentFile}` : ""}
                  {jobProgress.bytesPerSecond ? ` · ${formatGb(jobProgress.bytesPerSecond)} GB/s` : ""}
                </p>
              ) : null}
              <label className="flex items-center gap-2 text-sm text-slate-700">
                <input type="checkbox" checked={generateProxies} onChange={(e) => setGenerateProxies(e.target.checked)} />
                Generate proxies after verification
              </label>
              <Button disabled={busy || !session} onClick={() => void startHelperCopy()}>{busy ? "Copying…" : "Copy and verify"}</Button>
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" disabled={busy || !session} onClick={() => void queueProxyClips(false)}>Generate Proxies</Button>
                <Button variant="outline" disabled={busy || !session} onClick={() => void queueProxyClips(true)}>Retry Failed</Button>
              </div>
              {session ? <ProxyProgress clips={session.clips} /> : null}
            </>
          ) : (
            <p className="text-sm text-slate-700">This browser can index the source. It cannot reliably copy or checksum full-resolution camera files onto an SSD or NAS. Copy status stays Waiting until the local helper is connected.</p>
          )}
          <p className="text-sm text-slate-500">{session ? `${session.clips.length} clips` : "Scan a source first."}</p>
          <Button onClick={() => setStep(5)} disabled={!session}>Continue</Button>
        </section>
      ) : null}

      {step === 5 && session ? (
        <section className="space-y-2">
          {session.clips.map((clip) => (
            <article key={clip.id} className="rounded-xl border border-slate-200 px-3 py-2 text-sm">
              <p className="font-semibold text-slate-900">{clip.filename}</p>
              <p className="text-xs text-slate-500">
                {[clip.sourceCard, clip.cameraBody, clip.durationSeconds ? `${clip.durationSeconds}s` : "", clip.resolution, clip.sizeBytes ? `${Math.round(clip.sizeBytes / 1000000)} MB` : "", INGEST_COPY_LABELS[clip.copyStatus], "Proxy not created"]
                  .filter(Boolean)
                  .join(" · ")}
              </p>
              <p className="text-xs text-slate-500">{clip.sourcePath}</p>
              <p className="text-xs text-slate-500">{clip.destinationPath}</p>
              {clip.localProxyPath ? <p className="text-xs text-slate-500">Proxy · {clip.localProxyPath}</p> : null}
              {clip.proxyError ? <p className="text-xs text-red-700">{clip.proxyError}</p> : null}
              {clip.proxyStatus === "ready" && clip.localProxyPath && helperToken ? (
                <video
                  src={`${INGEST_HELPER_URL}/v1/media/stream?path=${encodeURIComponent(clip.localProxyPath)}&token=${encodeURIComponent(helperToken)}`}
                  controls
                  className="mt-2 h-28 w-full rounded bg-black"
                />
              ) : null}
            </article>
          ))}
          <Button onClick={() => setStep(6)}>Assign to shots</Button>
        </section>
      ) : null}

      {step === 6 && session ? (
        <section className="space-y-3">
          <label className="block text-sm font-medium text-slate-700">
            Production shot
            <select className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2" value={shotId} onChange={(e) => setShotId(e.target.value)}>
              <option value="">Leave unassigned</option>
              {shots.map((shot) => (
                <option key={shot.id} value={shot.id}>{shot.label}</option>
              ))}
            </select>
          </label>
          {session.clips.map((clip) => (
            <label key={clip.id} className="flex items-start gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm">
              <input type="checkbox" checked={selected.includes(clip.id)} onChange={(e) => setSelected((prev) => e.target.checked ? [...prev, clip.id] : prev.filter((id) => id !== clip.id))} />
              <span>
                <span className="font-semibold">{clip.filename}</span>
                <span className="mt-0.5 block text-xs text-slate-500">
                  {clip.linkedShotId ? `Assigned · ${shots.find((shot) => shot.id === clip.linkedShotId)?.label || "shot"}` : "Unassigned"}
                  {clip.suggestedShotId && !clip.linkedShotId ? ` · Suggested shot: ${shots.find((shot) => shot.id === clip.suggestedShotId)?.label || "match"}` : ""}
                </span>
              </span>
            </label>
          ))}
          <div className="flex flex-wrap gap-2">
            <Button disabled={busy || !selected.length || !shotId} onClick={() => void assign(shotId)}>Assign to shot</Button>
            <Button variant="outline" disabled={busy || !selected.length} onClick={() => void assign(null)}>Leave unassigned</Button>
          </div>
        </section>
      ) : null}
      <TakeMatchingPanel
        projectId={projectId}
        sessions={board.ingestSessions ?? []}
        groups={board.takeGroups ?? []}
        days={board.productionDays}
        shots={shots}
        helperToken={helperToken}
        onPersist={async (next) => {
          await saveProductionBoard(board.id, {
            takeGroups: next.groups,
            ...(next.sessions ? { ingestSessions: next.sessions } : {}),
            ...(next.days ? { productionDays: next.days } : {}),
          });
          setBoard({
            ...board,
            takeGroups: next.groups,
            ingestSessions: next.sessions ?? board.ingestSessions,
            productionDays: next.days ?? board.productionDays,
          });
          if (next.sessions && session) setSession(next.sessions.find((item) => item.id === session.id) ?? session);
        }}
      />
    </div>
  );
}

async function readSourceClips(): Promise<{ name: string; path: string; size: number; lastModified: number; file: File }[]> {
  const picker = (window as Window & { showDirectoryPicker?: () => Promise<DirHandle> }).showDirectoryPicker;
  if (picker) {
    const root = await picker();
    const found: { name: string; path: string; size: number; lastModified: number; file: File }[] = [];
    await walkDirectory(root, "", found);
    return found;
  }
  throw new Error("This browser cannot pick a folder. Use Chrome or Edge, then choose the card or drive.");
}

function ProxyProgress({ clips }: { clips: ProductionIngestClip[] }) {
  const count = (status: ProductionIngestClip["proxyStatus"]) => clips.filter((clip) => clip.proxyStatus === status).length;
  const current = clips.find((clip) => clip.proxyStatus === "generating");
  return (
    <p className="text-sm text-slate-700">
      Proxies · ready {count("ready")} · queued {count("queued")} · generating {count("generating")} · failed {count("failed")}
      {current ? ` · ${current.filename}${typeof current.proxyPercent === "number" ? ` ${current.proxyPercent}%` : ""}` : ""}
    </p>
  );
}

function joinLocal(root: string, ...parts: string[]) {
  const sep = root.includes("\\") ? "\\" : "/";
  return [root.replace(/[\\/]+$/, ""), ...parts.filter(Boolean)].join(sep);
}

function formatSpace(drive: HelperDrive) {
  if (drive.availableBytes == null) return "";
  const free = formatGb(drive.availableBytes);
  const total = drive.capacityBytes != null ? formatGb(drive.capacityBytes) : "";
  return total ? ` · ${free} GB free of ${total} GB` : ` · ${free} GB free`;
}

function formatGb(bytes: number) {
  return (bytes / 1_000_000_000).toFixed(2);
}

async function walkDirectory(
  dir: DirHandle,
  prefix: string,
  found: { name: string; path: string; size: number; lastModified: number; file: File }[]
) {
  for await (const [name, handle] of dir.entries()) {
    if (handle.kind === "file" && handle.getFile && VIDEO_EXT.test(name)) {
      const file = await handle.getFile();
      found.push({ name, path: `${prefix}${name}`, size: file.size, lastModified: file.lastModified, file });
    } else if (handle.kind === "directory" && handle.entries) {
      await walkDirectory(handle as DirHandle, `${prefix}${name}/`, found);
    }
  }
}

async function probePlayableClip(file: File): Promise<{ durationSeconds?: number; resolution?: string; thumbnail?: File }> {
  if (file.size > 1_500_000_000) return {};
  const url = URL.createObjectURL(file);
  const video = document.createElement("video");
  video.preload = "auto";
  video.muted = true;
  video.src = url;
  try {
    await new Promise<void>((resolve, reject) => {
      const timer = window.setTimeout(() => reject(new Error("timeout")), 8000);
      video.onloadeddata = () => {
        window.clearTimeout(timer);
        resolve();
      };
      video.onerror = () => {
        window.clearTimeout(timer);
        reject(new Error("decode"));
      };
    });
    const duration = Number.isFinite(video.duration) ? Math.round(video.duration * 10) / 10 : undefined;
    const width = video.videoWidth;
    const height = video.videoHeight;
    let thumbnail: File | undefined;
    if (width > 0 && height > 0 && file.size < 200_000_000) {
      if (duration && duration > 0.2) {
        video.currentTime = Math.min(0.5, duration / 2);
        await new Promise<void>((resolve) => {
          const timer = window.setTimeout(resolve, 1500);
          video.onseeked = () => {
            window.clearTimeout(timer);
            resolve();
          };
        });
      }
      const canvas = document.createElement("canvas");
      const scale = Math.min(1, 480 / width);
      canvas.width = Math.max(1, Math.round(width * scale));
      canvas.height = Math.max(1, Math.round(height * scale));
      canvas.getContext("2d")?.drawImage(video, 0, 0, canvas.width, canvas.height);
      const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.72));
      if (blob && blob.size > 0 && blob.size < 400_000) {
        thumbnail = new File([blob], `${file.name}.jpg`, { type: "image/jpeg" });
      }
    }
    return {
      durationSeconds: duration,
      resolution: width && height ? `${width}x${height}` : undefined,
      thumbnail,
    };
  } catch {
    return {};
  } finally {
    video.removeAttribute("src");
    video.load();
    URL.revokeObjectURL(url);
  }
}
