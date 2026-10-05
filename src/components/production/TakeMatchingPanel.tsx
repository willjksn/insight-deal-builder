"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { helperMatchAudio } from "@/lib/production/ingestHelper";
import { assignIngestClips } from "@/lib/production/ingest";
import type { ProductionIngestClip, ProductionIngestSession, TakeGroup } from "@/lib/production/ingestTypes";
import { createManualGroup, suggestTakeGroups } from "@/lib/production/takeMatch";
import type { ProductionDay, ProductionDayShot } from "@/lib/production/types";

export function TakeMatchingPanel({
  projectId,
  sessions,
  groups,
  days,
  shots,
  helperToken,
  onPersist,
}: {
  projectId: string;
  sessions: ProductionIngestSession[];
  groups: TakeGroup[];
  days: ProductionDay[];
  shots: ProductionDayShot[];
  helperToken: string | null;
  onPersist: (next: { groups: TakeGroup[]; sessions?: ProductionIngestSession[]; days?: ProductionDay[] }) => Promise<void>;
}) {
  const clips = sessions.flatMap((session) => session.clips);
  const [picked, setPicked] = useState<string[]>([]);
  const [shotId, setShotId] = useState("");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const byId = new Map(clips.map((clip) => [clip.id, clip]));

  async function analyze() {
    setBusy(true);
    setNotice(null);
    try {
      let waveform;
      const local = clips.filter((clip) => clip.localDestinationPath || clip.localSourcePath);
      if (helperToken && local.length) {
        const result = await helperMatchAudio(
          helperToken,
          local.map((clip) => ({ id: clip.id, path: (clip.localDestinationPath || clip.localSourcePath) as string }))
        );
        waveform = result.pairs;
        if (result.skipped.length) setNotice(`${result.skipped.length} clips had no usable audio.`);
      }
      const next = suggestTakeGroups({ projectId, clips, waveform, existing: groups });
      await onPersist({ groups: next });
      setNotice(`Matching updated. ${next.filter((group) => group.state === "suggested").length} suggested groups.`);
    } catch (err) {
      setNotice(err instanceof Error ? err.message : "Matching failed");
    } finally {
      setBusy(false);
    }
  }

  async function saveGroups(next: TakeGroup[]) {
    await onPersist({ groups: next.filter((group) => group.members.length >= 2) });
  }

  function updateGroup(id: string, patch: (group: TakeGroup) => TakeGroup) {
    return saveGroups(groups.map((group) => (group.id === id ? { ...patch(group), updatedAt: new Date().toISOString() } : group)));
  }

  function splitGroup(group: TakeGroup) {
    const moving = group.members.filter((member) => picked.includes(member.clipId));
    if (moving.length < 1 || moving.length === group.members.length) return;
    const rest = group.members.filter((member) => !picked.includes(member.clipId));
    const created = createManualGroup(projectId, moving.map((member) => member.clipId));
    return saveGroups(groups.map((item) => (item.id === group.id ? { ...item, members: rest } : item)).concat(created));
  }

  function mergePicked() {
    const chosen = groups.filter((group) => group.members.some((member) => picked.includes(member.clipId)));
    if (chosen.length < 2) return;
    const [first, ...rest] = chosen;
    const memberIds = [...new Set(chosen.flatMap((group) => group.members.map((member) => member.clipId)))];
    const merged: TakeGroup = {
      ...first,
      members: memberIds.map((clipId) => first.members.find((member) => member.clipId === clipId) || { clipId, offsetSeconds: 0 }),
      state: "confirmed",
      origin: "manual",
      matchReasons: [...new Set(chosen.flatMap((group) => group.matchReasons))],
      updatedAt: new Date().toISOString(),
    };
    return saveGroups([merged, ...groups.filter((group) => !rest.some((item) => item.id === group.id) && group.id !== first.id)]);
  }

  async function assignGroup(group: TakeGroup) {
    if (!shotId) return;
    let nextDays = days;
    let nextSessions = sessions;
    const ids = group.members.map((member) => member.clipId);
    for (const session of nextSessions) {
      const inSession = ids.filter((id) => session.clips.some((clip) => clip.id === id));
      if (!inSession.length) continue;
      const result = assignIngestClips(nextDays, session, inSession, shotId);
      nextDays = result.days;
      nextSessions = nextSessions.map((item) => (item.id === session.id ? result.session : item));
    }
    await onPersist({
      days: nextDays,
      sessions: nextSessions,
      groups: groups.map((item) => (item.id === group.id ? { ...item, productionShotId: shotId, state: "confirmed", updatedAt: new Date().toISOString() } : item)),
    });
  }

  return (
    <section className="mt-10 space-y-3 border-t border-slate-200 pt-6">
      <h2 className="text-lg font-semibold text-slate-900">Take Matching</h2>
      <p className="text-sm text-slate-600">Suggestions use timecode, local audio, recording time, and duration. Nothing is certain until you confirm it.</p>
      {notice ? <p className="text-sm text-slate-700">{notice}</p> : null}
      <div className="flex flex-wrap gap-2">
        <Button disabled={busy || clips.length < 2} onClick={() => void analyze()}>{busy ? "Matching…" : "Find take groups"}</Button>
        <Button
          variant="outline"
          disabled={picked.length < 2}
          onClick={() => void saveGroups([createManualGroup(projectId, picked), ...groups])}
        >
          Create Take Group
        </Button>
      </div>
      <div className="flex flex-wrap gap-2">
        {clips.map((clip) => (
          <label key={clip.id} className="flex items-center gap-1 rounded-lg bg-slate-100 px-2 py-1 text-xs">
            <input type="checkbox" checked={picked.includes(clip.id)} onChange={(e) => setPicked((prev) => e.target.checked ? [...prev, clip.id] : prev.filter((id) => id !== clip.id))} />
            {clipLabel(clip)}
          </label>
        ))}
      </div>
      <label className="block text-sm text-slate-700">
        Assign confirmed group to shot
        <select className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2" value={shotId} onChange={(e) => setShotId(e.target.value)}>
          <option value="">Choose a shot</option>
          {shots.map((shot) => <option key={shot.id} value={shot.id}>{shot.label}</option>)}
        </select>
      </label>
      {groups.map((group) => (
        <article key={group.id} className="rounded-xl border border-slate-200 p-3 text-sm">
          <p className="font-semibold text-slate-900">
            {group.takeNumber ? `Take ${group.takeNumber}` : "Take"} — {group.state === "confirmed" ? "Confirmed" : "Suggested"} — {group.confidence} confidence
          </p>
          <ul className="mt-1 text-xs text-slate-600">
            {group.members.map((member) => {
              const clip = byId.get(member.clipId);
              return (
                <li key={member.clipId}>
                  {clip ? clipLabel(clip) : member.clipId}
                  {member.offsetSeconds ? ` · ${member.offsetSeconds > 0 ? "+" : ""}${member.offsetSeconds.toFixed(3)} sec` : " · 0.000"}
                  {group.preferredVideoClipId === member.clipId ? " · Preferred video" : ""}
                  {group.preferredAudioClipId === member.clipId ? " · Preferred audio" : ""}
                </li>
              );
            })}
          </ul>
          <p className="mt-1 text-xs text-slate-500">{group.matchReasons.join(" · ")}</p>
          {group.pendingClipIds?.length ? <p className="mt-1 text-xs text-amber-800">Suggested addition: {group.pendingClipIds.join(", ")}. Confirm before adding.</p> : null}
          <div className="mt-2 flex flex-wrap gap-2 text-xs font-semibold">
            {group.state === "suggested" ? <button type="button" className="text-sky-800" onClick={() => void saveGroups(groups.map((item) => item.id === group.id ? { ...item, state: "confirmed", updatedAt: new Date().toISOString() } : item))}>Confirm</button> : null}
            <button type="button" className="text-slate-600" onClick={() => void assignGroup({ ...group, state: "confirmed" })}>Assign to Shot</button>
            <button type="button" className="text-slate-500" onClick={() => void saveGroups(groups.filter((item) => item.id !== group.id))}>Reject</button>
            <button type="button" className="text-slate-600" onClick={() => void updateGroup(group.id, (item) => ({ ...item, members: [...item.members, ...picked.filter((id) => !item.members.some((member) => member.clipId === id)).map((clipId) => ({ clipId, offsetSeconds: 0 }))] }))}>Add clip</button>
            <button type="button" className="text-slate-600" onClick={() => void updateGroup(group.id, (item) => ({ ...item, members: item.members.filter((member) => !picked.includes(member.clipId)) }))}>Remove clip</button>
            <button type="button" className="text-slate-600" onClick={() => void splitGroup(group)}>Split</button>
            <button type="button" className="text-slate-600" onClick={() => void mergePicked()}>Merge</button>
            <button type="button" className="text-slate-600" onClick={() => void updateGroup(group.id, (item) => ({ ...item, preferredVideoClipId: picked.find((id) => item.members.some((member) => member.clipId === id)) || item.preferredVideoClipId }))}>Preferred Video</button>
            <button type="button" className="text-slate-600" onClick={() => void updateGroup(group.id, (item) => ({ ...item, preferredAudioClipId: picked.find((id) => item.members.some((member) => member.clipId === id)) || item.preferredAudioClipId }))}>Preferred Audio</button>
          </div>
        </article>
      ))}
    </section>
  );
}

function clipLabel(clip: ProductionIngestClip) {
  const camera = clip.cameraSlot === "other" ? clip.cameraBody || "Audio" : `Camera ${clip.cameraSlot}`;
  return `${camera}${clip.cameraBody && clip.cameraSlot !== "other" ? ` — ${clip.cameraBody}` : ""} · ${clip.filename}`;
}
