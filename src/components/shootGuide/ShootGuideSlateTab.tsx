"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Card, CardBody } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import {
  logTake,
  nextTakeNumber,
  slateDefaults,
} from "@/lib/shootGuide/slate";
import {
  TAKE_STATUSES,
  TAKE_STATUS_LABELS,
  type ShootGuide,
  type ShootGuideShot,
  type ShootGuideSlateRecord,
  type ShootGuideTakeStatus,
} from "@/lib/shootGuide/types";
import { cn } from "@/lib/utils/cn";

export function ShootGuideSlateTab({
  guide,
  saving,
  onChangeCurrent,
  onCommit,
}: {
  guide: ShootGuide;
  saving: boolean;
  onChangeCurrent: (shotId: string) => void;
  onCommit: (next: {
    shots: ShootGuideShot[];
    slateRecords: ShootGuideSlateRecord[];
    currentShotId: string;
    status?: ShootGuide["status"];
  }) => void;
}) {
  const shots = guide.shots ?? [];
  const currentId = guide.currentShotId || shots[0]?.id || "";
  const shot = shots.find((s) => s.id === currentId) ?? shots[0];
  const lastSlate = (guide.slateRecords ?? []).slice(-1)[0] ?? null;

  if (!shot) {
    return (
      <Card>
        <CardBody className="text-sm text-slate-600">Generate shots first, then slate here.</CardBody>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Select
        label="Current shot"
        value={shot.id}
        onChange={(e) => onChangeCurrent(e.target.value)}
        options={shots.map((s) => ({
          value: s.id,
          label: `${String(s.shotNumber).padStart(2, "0")} · ${s.title}`,
        }))}
        touch
      />
      <SlateFields
        key={`${shot.id}:${shot.takeRecords?.length ?? 0}`}
        guide={guide}
        shot={shot}
        lastSlate={lastSlate}
        saving={saving}
        onCommit={onCommit}
      />
    </div>
  );
}

function SlateFields({
  guide,
  shot,
  lastSlate,
  saving,
  onCommit,
}: {
  guide: ShootGuide;
  shot: ShootGuideShot;
  lastSlate: ShootGuideSlateRecord | null;
  saving: boolean;
  onCommit: (next: {
    shots: ShootGuideShot[];
    slateRecords: ShootGuideSlateRecord[];
    currentShotId: string;
    status?: ShootGuide["status"];
  }) => void;
}) {
  const defaults = slateDefaults(guide, shot, lastSlate);
  const [roll, setRoll] = useState(defaults.roll || "A001");
  const [scene, setScene] = useState(defaults.scene || "");
  const [cameraRoll, setCameraRoll] = useState(defaults.cameraRoll || "A001");
  const [soundRoll, setSoundRoll] = useState(defaults.soundRoll || "");
  const [fps, setFps] = useState(defaults.fps || "24");
  const [audioSync, setAudioSync] = useState(defaults.audioSync || "");
  const [timecode, setTimecode] = useState(defaults.timecode || "");
  const [date, setDate] = useState(defaults.date || "");
  const [note, setNote] = useState("");
  const [status, setStatus] = useState<ShootGuideTakeStatus>("HOLD");
  const take = nextTakeNumber(shot);

  function commitTake(nextStatus: ShootGuideTakeStatus, completeShot = false) {
    const takeRecord = logTake({
      shot,
      takeNumber: take,
      status: nextStatus,
      note,
      soundRoll,
    });
    const slate: ShootGuideSlateRecord = {
      id: crypto.randomUUID(),
      shotId: shot.id,
      roll,
      scene,
      shot: String(shot.shotNumber).padStart(2, "0"),
      take,
      camera: shot.camera || "A",
      cameraRoll,
      soundRoll,
      fps,
      audioSync: audioSync === "mos" || audioSync === "sync" ? audioSync : "",
      timecode,
      date,
      notes: note,
    };
    const shotsNext = (guide.shots ?? []).map((s) =>
      s.id === shot.id
        ? {
            ...s,
            takeRecords: [...(s.takeRecords ?? []), takeRecord],
            status: completeShot ? "complete" : s.status === "planned" ? "in_progress" : s.status,
          }
        : s
    );
    onCommit({
      shots: shotsNext,
      slateRecords: [...(guide.slateRecords ?? []), slate],
      currentShotId: shot.id,
      status: completeShot && guide.status === "ready" ? "in_progress" : guide.status,
    });
  }

  return (
    <>
      <Card>
        <CardBody className="space-y-3">
          <p className="text-sm font-semibold text-slate-900">
            Scene {scene || "—"} · Shot {String(shot.shotNumber).padStart(2, "0")} · Take {take}
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            <Input label="Roll" value={roll} onChange={(e) => setRoll(e.target.value)} />
            <Input label="Scene" value={scene} onChange={(e) => setScene(e.target.value)} />
            <Input label="Camera roll" value={cameraRoll} onChange={(e) => setCameraRoll(e.target.value)} />
            <Input label="Sound roll" value={soundRoll} onChange={(e) => setSoundRoll(e.target.value)} />
            <Input label="FPS" value={fps} onChange={(e) => setFps(e.target.value)} />
            <Select
              label="Audio"
              value={audioSync}
              onChange={(e) => setAudioSync(e.target.value)}
              options={[
                { value: "", label: "—" },
                { value: "sync", label: "Sync" },
                { value: "mos", label: "MOS" },
              ]}
            />
            <Input label="Timecode" value={timecode} onChange={(e) => setTimecode(e.target.value)} />
            <Input label="Date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
          <Input
            label="Take note"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Optional note for this take"
          />
          <div className="flex flex-wrap gap-2">
            {TAKE_STATUSES.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setStatus(s)}
                className={cn(
                  "rounded-full px-3 py-1.5 text-xs font-semibold min-h-[40px]",
                  status === s ? "bg-sky-600 text-white" : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                )}
              >
                {TAKE_STATUS_LABELS[s]}
              </button>
            ))}
          </div>
          <div className="flex flex-wrap gap-2">
            <Button size="touch" disabled={saving} onClick={() => commitTake(status)}>
              {saving ? "Saving…" : "Next Take"}
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={saving}
              onClick={() => commitTake(status === "NG" ? "GOOD" : status, true)}
            >
              Log take and complete shot
            </Button>
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardBody className="space-y-2">
          <p className="text-sm font-semibold text-slate-900">Takes on this shot</p>
          {(shot.takeRecords ?? []).length === 0 ? (
            <p className="text-sm text-slate-500">No takes yet.</p>
          ) : (
            (shot.takeRecords ?? []).map((t) => (
              <p key={t.id} className="text-sm text-slate-700">
                Take {t.takeNumber}
                {t.status ? ` · ${TAKE_STATUS_LABELS[t.status] || t.status}` : ""}
                {t.note ? ` — ${t.note}` : ""}
              </p>
            ))
          )}
        </CardBody>
      </Card>
    </>
  );
}
