"use client";

import { Button } from "@/components/ui/Button";
import type {
  ColorPlan,
  ContentPlan,
  ContentPlanGenerateSection,
  DavinciBlueprint,
  EditPlan,
  LightingPlan,
  MusicPlan,
  SoundCue,
  SoundPlan,
} from "@/lib/contentPlan/types";

function Block({ title, body }: { title: string; body?: string }) {
  if (!body?.trim()) return null;
  return (
    <div>
      <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">{title}</p>
      <p className="mt-1 whitespace-pre-wrap text-sm text-slate-800">{body}</p>
    </div>
  );
}

function CueList({ title, cues }: { title: string; cues: SoundCue[] }) {
  if (!cues.length) return null;
  return (
    <div>
      <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">{title}</p>
      <ul className="mt-2 space-y-2">
        {cues.map((c) => (
          <li key={c.id} className="rounded-xl border border-slate-100 bg-slate-50/80 px-3 py-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-sky-800">
              {c.timelinePosition} · {c.soundName}
            </p>
            <p className="mt-1 text-sm text-slate-800">{c.purpose}</p>
            {c.associatedShotLabel ? (
              <p className="mt-0.5 text-xs text-slate-500">Shot: {c.associatedShotLabel}</p>
            ) : null}
            {c.levelDirection ? (
              <p className="mt-0.5 text-xs text-slate-600">Mix: {c.levelDirection}</p>
            ) : null}
          </li>
        ))}
      </ul>
    </div>
  );
}

function SectionHeader({
  title,
  busy,
  onRegen,
  section,
}: {
  title: string;
  busy: boolean;
  onRegen: (section: ContentPlanGenerateSection) => void;
  section: ContentPlanGenerateSection;
}) {
  return (
    <div className="flex items-center justify-between gap-2">
      <h4 className="font-semibold text-slate-900">{title}</h4>
      <Button
        type="button"
        size="sm"
        variant="secondary"
        disabled={busy}
        onClick={() => onRegen(section)}
      >
        Regenerate
      </Button>
    </div>
  );
}

export function EditMapPanel({
  editPlan,
  davinci,
  teachMe,
  busy,
  onRegen,
  onUpdateEditPlan,
}: {
  editPlan?: EditPlan | null;
  davinci?: DavinciBlueprint | null;
  teachMe: boolean;
  busy: boolean;
  onRegen: (section: ContentPlanGenerateSection) => void;
  onUpdateEditPlan?: (next: EditPlan) => void;
}) {
  if (!editPlan) {
    return (
      <EmptyPhase2
        label="Edit Map"
        hint="Generate Phase 2 post to build the edit blueprint and timeline map."
        busy={busy}
        onRegen={() => onRegen("edit")}
      />
    );
  }

  return (
    <div className="space-y-4">
      <SectionHeader title="Edit Map" busy={busy} onRegen={onRegen} section="edit" />
      <Block title="Editing philosophy" body={editPlan.philosophy} />

      <div>
        <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
          Timeline map
        </p>
        <ol className="mt-2 space-y-2">
          {editPlan.map.map((item, i) => (
            <li key={item.id} className="rounded-xl border border-slate-200 bg-white px-3 py-2.5">
              <p className="text-xs font-semibold uppercase tracking-wide text-sky-800">
                {item.startTime}–{item.endTime}
              </p>
              <p className="mt-0.5 text-sm font-medium text-slate-900">{item.shotLabel}</p>
              {item.note ? <p className="mt-1 text-sm text-slate-600">{item.note}</p> : null}
              {i < editPlan.map.length - 1 ? (
                onUpdateEditPlan ? (
                  <label className="mt-2 block space-y-1">
                    <span className="text-[11px] font-medium text-slate-500">
                      Transition to next
                    </span>
                    <input
                      defaultValue={item.transitionToNext || ""}
                      onBlur={(e) => {
                        const v = e.target.value.trim();
                        if (v === (item.transitionToNext || "")) return;
                        onUpdateEditPlan({
                          ...editPlan,
                          map: editPlan.map.map((m) =>
                            m.id === item.id
                              ? { ...m, transitionToNext: v || undefined }
                              : m
                          ),
                        });
                      }}
                      placeholder="e.g. cut / dissolve / whip"
                      className="w-full rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs outline-none ring-sky-200 focus:ring-2"
                    />
                  </label>
                ) : item.transitionToNext ? (
                  <p className="mt-2 text-center text-xs font-semibold text-slate-500">
                    ↓ {item.transitionToNext}
                  </p>
                ) : null
              ) : null}
            </li>
          ))}
        </ol>
      </div>

      <div>
        <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
          Cut blueprint
        </p>
        <ul className="mt-2 space-y-2">
          {editPlan.instructions.map((ed) => (
            <li key={ed.id} className="rounded-xl border border-slate-100 bg-slate-50/80 px-3 py-2.5">
              <p className="text-xs font-semibold uppercase tracking-wide text-sky-800">
                {ed.approximateTimelinePosition} · {ed.editType}
              </p>
              <p className="mt-1 text-sm text-slate-800">
                {ed.fromShotLabel || ed.fromShotId} → {ed.toShotLabel || ed.toShotId}
              </p>
              <p className="mt-1 text-sm text-slate-700">
                <span className="font-medium">Trigger:</span> {ed.cutTrigger}
              </p>
              <p className="mt-1 text-sm text-slate-600">{ed.why}</p>
              {onUpdateEditPlan ? (
                <label className="mt-2 block space-y-1">
                  <span className="text-[11px] font-medium text-slate-500">Speed notes</span>
                  <input
                    defaultValue={ed.speedNotes || ""}
                    onBlur={(e) => {
                      const v = e.target.value.trim();
                      if (v === (ed.speedNotes || "")) return;
                      onUpdateEditPlan({
                        ...editPlan,
                        instructions: editPlan.instructions.map((x) =>
                          x.id === ed.id ? { ...x, speedNotes: v || undefined } : x
                        ),
                      });
                    }}
                    placeholder="e.g. ramp to 50% then smash cut"
                    className="w-full rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs outline-none ring-sky-200 focus:ring-2"
                  />
                </label>
              ) : ed.speedNotes ? (
                <p className="mt-1 text-xs text-slate-500">Speed: {ed.speedNotes}</p>
              ) : null}
              {teachMe && ed.teachMeNotes ? (
                <p className="mt-2 rounded-lg bg-amber-50 px-2 py-1.5 text-xs text-amber-950">
                  Teach me: {ed.teachMeNotes}
                </p>
              ) : null}
            </li>
          ))}
        </ul>
      </div>

      {davinci ? (
        <div className="rounded-xl border border-violet-100 bg-violet-50/50 px-3 py-3">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-violet-900">
            DaVinci track blueprint
          </p>
          <div className="mt-2 grid gap-3 sm:grid-cols-2">
            <div>
              <p className="text-xs font-medium text-slate-700">Video</p>
              <ul className="mt-1 list-disc pl-4 text-sm text-slate-800">
                {davinci.videoTracks.map((t) => (
                  <li key={t}>{t}</li>
                ))}
              </ul>
            </div>
            <div>
              <p className="text-xs font-medium text-slate-700">Audio</p>
              <ul className="mt-1 list-disc pl-4 text-sm text-slate-800">
                {davinci.audioTracks.map((t) => (
                  <li key={t}>{t}</li>
                ))}
              </ul>
            </div>
          </div>
          {davinci.assemblyNotes?.length ? (
            <ul className="mt-2 list-disc space-y-1 pl-4 text-sm text-slate-700">
              {davinci.assemblyNotes.map((n, i) => (
                <li key={`an-${i}`}>{n}</li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

export function SoundPanel({
  soundPlan,
  busy,
  onRegen,
}: {
  soundPlan?: SoundPlan | null;
  busy: boolean;
  onRegen: (section: ContentPlanGenerateSection) => void;
}) {
  if (!soundPlan) {
    return (
      <EmptyPhase2
        label="Sound"
        hint="Generate sound design cues (production, foley, designed SFX)."
        busy={busy}
        onRegen={() => onRegen("sound")}
      />
    );
  }
  return (
    <div className="space-y-4">
      <SectionHeader title="Sound design" busy={busy} onRegen={onRegen} section="sound" />
      <Block title="Overview" body={soundPlan.overview} />
      <CueList title="Production audio" cues={soundPlan.productionAudio} />
      <CueList title="Foley" cues={soundPlan.foley} />
      <CueList title="Designed SFX" cues={soundPlan.designedSfx} />
      {soundPlan.mixNotes?.length ? (
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
            Mix notes
          </p>
          <ul className="mt-1 list-disc space-y-1 pl-4 text-sm text-slate-800">
            {soundPlan.mixNotes.map((n, i) => (
              <li key={`mn-${i}`}>{n}</li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}

export function MusicPanel({
  musicPlan,
  busy,
  onRegen,
}: {
  musicPlan?: MusicPlan | null;
  busy: boolean;
  onRegen: (section: ContentPlanGenerateSection) => void;
}) {
  if (!musicPlan) {
    return (
      <EmptyPhase2
        label="Music"
        hint="Generate music direction (style, BPM, energy curve)."
        busy={busy}
        onRegen={() => onRegen("music")}
      />
    );
  }
  return (
    <div className="space-y-4">
      <SectionHeader title="Music direction" busy={busy} onRegen={onRegen} section="music" />
      <div className="grid gap-3 sm:grid-cols-2">
        <Block title="Style" body={musicPlan.style} />
        <Block title="Mood" body={musicPlan.mood} />
        <Block title="BPM" body={musicPlan.bpm} />
        <Block title="Instrumentation" body={musicPlan.instrumentation} />
      </div>
      <Block title="Energy curve" body={musicPlan.energyCurve} />
      <div className="flex flex-wrap gap-2 text-xs">
        {musicPlan.beginAt ? (
          <span className="rounded-full bg-slate-100 px-2 py-1">Begin {musicPlan.beginAt}</span>
        ) : null}
        {musicPlan.liftAt ? (
          <span className="rounded-full bg-slate-100 px-2 py-1">Lift {musicPlan.liftAt}</span>
        ) : null}
        {musicPlan.dropAt ? (
          <span className="rounded-full bg-slate-100 px-2 py-1">Drop {musicPlan.dropAt}</span>
        ) : null}
        {musicPlan.resolveAt ? (
          <span className="rounded-full bg-slate-100 px-2 py-1">Resolve {musicPlan.resolveAt}</span>
        ) : null}
      </div>
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
          Structure
        </p>
        <ul className="mt-2 space-y-1.5">
          {musicPlan.structure.map((s, i) => (
            <li key={`ms-${i}`} className="text-sm text-slate-800">
              <span className="font-medium text-sky-800">{s.time}</span> — {s.note}
            </li>
          ))}
        </ul>
      </div>
      {musicPlan.beatCutOpportunities?.length ? (
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
            Beat-cut opportunities
          </p>
          <ul className="mt-1 list-disc space-y-1 pl-4 text-sm text-slate-800">
            {musicPlan.beatCutOpportunities.map((n, i) => (
              <li key={`bc-${i}`}>{n}</li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}

export function LookPanel({
  colorPlan,
  busy,
  onRegen,
}: {
  colorPlan?: ColorPlan | null;
  busy: boolean;
  onRegen: (section: ContentPlanGenerateSection) => void;
}) {
  if (!colorPlan) {
    return (
      <EmptyPhase2
        label="Look"
        hint="Generate color / look direction for Resolve."
        busy={busy}
        onRegen={() => onRegen("look")}
      />
    );
  }
  return (
    <div className="space-y-3">
      <SectionHeader title="Look / color" busy={busy} onRegen={onRegen} section="look" />
      <p className="text-lg font-semibold text-slate-900">{colorPlan.lookName}</p>
      {(
        [
          ["Contrast", colorPlan.contrast],
          ["Saturation", colorPlan.saturation],
          ["Skin tones", colorPlan.skinToneDirection],
          ["Highlights", colorPlan.highlightTreatment],
          ["Shadows", colorPlan.shadowTreatment],
          ["White balance", colorPlan.whiteBalanceIntent],
          ["Temp contrast", colorPlan.colorTemperatureContrast],
          ["Grain", colorPlan.grain],
          ["Halation", colorPlan.halation],
          ["Vignette", colorPlan.vignette],
        ] as const
      ).map(([label, value]) => (
        <Block key={label} title={label} body={value} />
      ))}
      {colorPlan.notes?.length ? (
        <ul className="list-disc space-y-1 pl-4 text-sm text-slate-800">
          {colorPlan.notes.map((n, i) => (
            <li key={`cn-${i}`}>{n}</li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

export function LightingPanel({
  lightingPlan,
  teachMe,
  busy,
  onRegen,
}: {
  lightingPlan?: LightingPlan | null;
  teachMe: boolean;
  busy: boolean;
  onRegen: (section: ContentPlanGenerateSection) => void;
}) {
  if (!lightingPlan) {
    return (
      <EmptyPhase2
        label="Lighting"
        hint="Generate a practical lighting strategy for the shoot."
        busy={busy}
        onRegen={() => onRegen("lighting")}
      />
    );
  }
  return (
    <div className="space-y-3">
      <SectionHeader title="Lighting plan" busy={busy} onRegen={onRegen} section="lighting" />
      <Block title="Overview" body={lightingPlan.overview} />
      <Block title="Motivated source" body={lightingPlan.motivatedSource} />
      <Block title="Key" body={lightingPlan.key} />
      <Block title="Fill" body={lightingPlan.fill} />
      <Block title="Negative fill" body={lightingPlan.negativeFill} />
      <Block title="Backlight" body={lightingPlan.backlight} />
      <Block title="Practicals" body={lightingPlan.practicals} />
      <Block title="Background" body={lightingPlan.backgroundSeparation} />
      <Block title="Color temperature" body={lightingPlan.colorTemperature} />
      <Block title="Exposure priorities" body={lightingPlan.exposurePriorities} />
      {lightingPlan.setupByLocation?.length ? (
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
            By location
          </p>
          <ul className="mt-2 space-y-2">
            {lightingPlan.setupByLocation.map((s, i) => (
              <li key={`ls-${i}`} className="rounded-xl border border-slate-100 px-3 py-2">
                <p className="text-sm font-medium text-slate-900">{s.location}</p>
                <p className="mt-1 text-sm text-slate-700">{s.setup}</p>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
      {lightingPlan.gearRecommendations?.length ? (
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
            Gear
          </p>
          <ul className="mt-1 list-disc space-y-1 pl-4 text-sm text-slate-800">
            {lightingPlan.gearRecommendations.map((g, i) => (
              <li key={`lg-${i}`}>{g}</li>
            ))}
          </ul>
        </div>
      ) : null}
      {teachMe && lightingPlan.teachMeNotes ? (
        <p className="rounded-xl bg-amber-50 px-3 py-2 text-sm text-amber-950">
          Teach me: {lightingPlan.teachMeNotes}
        </p>
      ) : null}
    </div>
  );
}

function EmptyPhase2({
  label,
  hint,
  busy,
  onRegen,
}: {
  label: string;
  hint: string;
  busy: boolean;
  onRegen: () => void;
}) {
  return (
    <div className="space-y-3 py-6 text-center">
      <p className="font-medium text-slate-900">{label} not generated yet</p>
      <p className="text-sm text-slate-600">{hint}</p>
      <Button type="button" size="sm" disabled={busy} onClick={onRegen}>
        Generate {label}
      </Button>
    </div>
  );
}

export function Phase2SummaryActions({
  plan,
  busy,
  onRegen,
}: {
  plan: ContentPlan;
  busy: boolean;
  onRegen: (section: ContentPlanGenerateSection) => void;
}) {
  const missing =
    !plan.editPlan || !plan.soundPlan || !plan.musicPlan || !plan.colorPlan || !plan.lightingPlan;
  if (!missing) return null;
  return (
    <div className="rounded-xl border border-sky-100 bg-sky-50/70 px-3 py-2.5 text-sm">
      <p className="text-slate-800">
        Phase 2 post (edit / sound / music / look / lighting) can be generated after shots.
      </p>
      <Button
        type="button"
        size="sm"
        className="mt-2"
        disabled={busy || !plan.shots?.length}
        onClick={() => onRegen("phase2")}
      >
        Generate Phase 2 post
      </Button>
    </div>
  );
}
