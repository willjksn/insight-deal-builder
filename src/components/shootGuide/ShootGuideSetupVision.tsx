"use client";

import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import type { ShootGuide, ShootGuideLocationAnalysis } from "@/lib/shootGuide/types";

const LOCATION_FIELDS: { key: keyof ShootGuideLocationAnalysis; label: string }[] = [
  { key: "layout", label: "Layout" },
  { key: "subjectPlacement", label: "Subject" },
  { key: "windows", label: "Windows" },
  { key: "practicals", label: "Practicals" },
  { key: "obstacles", label: "Obstacles" },
  { key: "backgrounds", label: "Backgrounds" },
  { key: "clutter", label: "Clutter" },
  { key: "cameraZones", label: "Camera zones" },
  { key: "lightZones", label: "Light zones" },
  { key: "cameraDirection", label: "Camera direction" },
  { key: "geometry", label: "Geometry" },
];

export function ShootGuideSetupVision({
  guide,
  saving,
  generating,
  onAnalyze,
  onFiles,
}: {
  guide: ShootGuide;
  saving: boolean;
  generating: boolean;
  onAnalyze: () => void;
  onFiles: (kind: "location" | "mood", files: FileList | null) => void;
}) {
  const loc = guide.locationAnalysis;
  const locRows = LOCATION_FIELDS.filter((f) => loc?.[f.key]);
  const fixtures = guide.lightingPlan?.fixtures ?? [];

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-slate-200/80 bg-white px-4 py-3">
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
          Stills
        </p>
        <p className="mb-3 text-xs text-slate-500">
          Location photos inform what is possible in this room. Mood stills inform the look.
          Analyze reads your stills into location notes, lighting, and the grade — not a diagram.
        </p>
        <div className="grid gap-3 sm:grid-cols-2">
          <Input
            label="Location image(s)"
            type="file"
            accept="image/*"
            multiple
            onChange={(e) => onFiles("location", e.target.files)}
          />
          <Input
            label="Mood / look reference(s)"
            type="file"
            accept="image/*"
            multiple
            onChange={(e) => onFiles("mood", e.target.files)}
          />
        </div>
        <Button
          className="mt-3"
          variant="outline"
          size="sm"
          disabled={generating || saving}
          onClick={onAnalyze}
        >
          {generating ? "Analyzing…" : "Analyze stills"}
        </Button>
      </div>

      {locRows.length ? (
        <div className="rounded-xl border border-slate-200/80 bg-white px-4 py-3">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
            Location analysis
          </p>
          <dl className="space-y-2 text-sm text-slate-800">
            {locRows.map((f) => (
              <div key={f.key}>
                <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  {f.label}
                </dt>
                <dd className="mt-0.5 leading-relaxed">{loc?.[f.key]}</dd>
              </div>
            ))}
          </dl>
        </div>
      ) : null}

      {guide.visualAnalysis &&
      Object.values(guide.visualAnalysis).some((v) => Boolean(v)) ? (
        <div className="rounded-xl border border-slate-200/80 bg-white px-4 py-3">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
            Look / mood
          </p>
          <ul className="space-y-1 text-sm text-slate-800">
            {guide.visualAnalysis.palette ? <li>Palette: {guide.visualAnalysis.palette}</li> : null}
            {guide.visualAnalysis.energy ? <li>Energy: {guide.visualAnalysis.energy}</li> : null}
            {guide.visualAnalysis.contrast ? <li>Contrast: {guide.visualAnalysis.contrast}</li> : null}
            {guide.visualAnalysis.colorTemperature ? (
              <li>Color temp: {guide.visualAnalysis.colorTemperature}</li>
            ) : null}
            {guide.visualAnalysis.lightingDirection ? (
              <li>Light: {guide.visualAnalysis.lightingDirection}</li>
            ) : null}
          </ul>
        </div>
      ) : null}

      {fixtures.length ? (
        <div className="rounded-xl border border-slate-200/80 bg-white px-4 py-3">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
            Lighting placement
          </p>
          {guide.lightingPlan?.cameraWb ? (
            <p className="mb-2 text-sm text-slate-700">WB {guide.lightingPlan.cameraWb}</p>
          ) : null}
          {guide.lightingPlan?.summary ? (
            <p className="mb-2 text-sm text-slate-700">{guide.lightingPlan.summary}</p>
          ) : null}
          <ul className="space-y-2 text-sm text-slate-800">
            {fixtures.map((fx) => (
              <li key={fx.id}>
                <span className="font-semibold capitalize">{fx.role || "fixture"}</span>
                {fx.fixture ? ` · ${fx.fixture}` : ""}
                {fx.placement ? ` — ${fx.placement}` : ""}
                {fx.height ? ` · ${fx.height}` : ""}
                {fx.kelvin ? ` · ${fx.kelvin}` : ""}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
