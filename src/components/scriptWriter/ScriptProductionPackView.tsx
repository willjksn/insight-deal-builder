"use client";

import { ScriptDocument } from "@/lib/scriptWriter/types";

export function ScriptProductionPackView({ script }: { script: ScriptDocument }) {
  const pack = script.productionPack;
  if (!pack) return null;

  return (
    <div className="space-y-4 border-t border-slate-100 pt-4">
      {pack.premise ? (
        <div>
          <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-500">Premise</h4>
          <p className="mt-1 text-sm text-slate-700">{pack.premise}</p>
        </div>
      ) : null}
      {pack.tone ? (
        <div>
          <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-500">Tone</h4>
          <p className="mt-1 text-sm text-slate-700">{pack.tone}</p>
        </div>
      ) : null}

      {pack.timedBeats?.length ? (
        <div>
          <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Timed beats
          </h4>
          <ul className="mt-2 space-y-2">
            {pack.timedBeats.map((beat, i) => (
              <li key={i} className="rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-700">
                <span className="font-semibold text-violet-800">
                  {formatSec(beat.startSec)}–{formatSec(beat.endSec)}
                </span>
                <p className="mt-0.5">{beat.visual}</p>
                {beat.audio ? <p className="mt-0.5 text-slate-500">Audio: {beat.audio}</p> : null}
                {beat.dialogue ? (
                  <p className="mt-0.5 italic text-slate-600">{beat.dialogue}</p>
                ) : null}
                {beat.onScreenText ? (
                  <p className="mt-0.5 font-medium uppercase tracking-wide text-slate-800">
                    {beat.onScreenText}
                  </p>
                ) : null}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {pack.editTimeline?.length ? (
        <div>
          <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Edit timeline
          </h4>
          <div className="mt-2 overflow-x-auto">
            <table className="w-full min-w-[320px] text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500">
                  <th className="py-1 pr-2 font-medium">Time</th>
                  <th className="py-1 pr-2 font-medium">Visual</th>
                  <th className="py-1 font-medium">Audio</th>
                </tr>
              </thead>
              <tbody>
                {pack.editTimeline.map((row, i) => (
                  <tr key={i} className="border-b border-slate-100 text-slate-700">
                    <td className="py-1.5 pr-2 align-top font-medium text-violet-800">{row.time}</td>
                    <td className="py-1.5 pr-2 align-top">{row.visual}</td>
                    <td className="py-1.5 align-top text-slate-500">{row.audio}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}

      {pack.cinematicLook ? (
        <div>
          <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-500">Look</h4>
          <ul className="mt-1 space-y-1 text-sm text-slate-700">
            {pack.cinematicLook.lighting ? <li>Lighting: {pack.cinematicLook.lighting}</li> : null}
            {pack.cinematicLook.color ? <li>Color: {pack.cinematicLook.color}</li> : null}
            {pack.cinematicLook.cameraStyle ? (
              <li>Camera: {pack.cinematicLook.cameraStyle}</li>
            ) : null}
          </ul>
        </div>
      ) : null}

      {script.suggestedShots.length ? (
        <div>
          <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-500">Shot list</h4>
          <ol className="mt-2 list-decimal space-y-2 pl-4 text-xs text-slate-700">
            {script.suggestedShots.map((shot) => (
              <li key={`${shot.sceneNumber}-${shot.shotNumber}`}>
                <span className="font-medium">{shot.shotName || shot.description.slice(0, 60)}</span>
                {shot.lens ? <span className="text-slate-500"> · {shot.lens}</span> : null}
                {shot.lighting ? <p className="text-slate-500">Light: {shot.lighting}</p> : null}
                {shot.purpose ? <p className="text-slate-500">{shot.purpose}</p> : null}
              </li>
            ))}
          </ol>
        </div>
      ) : null}

      {pack.soundDesign?.length ? (
        <div>
          <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-500">Sound</h4>
          <ul className="mt-1 list-disc pl-4 text-sm text-slate-700">
            {pack.soundDesign.map((s, i) => (
              <li key={i}>{s}</li>
            ))}
          </ul>
        </div>
      ) : null}

      {pack.props?.length ? (
        <div>
          <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-500">Props</h4>
          <p className="mt-1 text-sm text-slate-700">{pack.props.join(" · ")}</p>
        </div>
      ) : null}

      {pack.cameraGearNotes ? (
        <div>
          <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-500">Camera</h4>
          <p className="mt-1 whitespace-pre-wrap text-sm text-slate-700">{pack.cameraGearNotes}</p>
        </div>
      ) : null}
    </div>
  );
}

function formatSec(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}
