"use client";

import { ScriptDocument } from "@/lib/scriptWriter/types";
import { ScriptShotListCard } from "@/components/scriptWriter/ScriptShotListCard";

export function ScriptProductionPackView({ script }: { script: ScriptDocument }) {
  const pack = script.productionPack;
  if (!pack) return null;

  return (
    <div className="space-y-4 border-t border-slate-100 pt-4">
      {pack.premise ? (
        <div>
          <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-500">Premise</h4>
          <p className="mt-1 break-words text-sm text-slate-700">{pack.premise}</p>
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

      {pack.lensPlan?.length ? (
        <div>
          <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-500">Lens plan</h4>
          <div className="mt-2 overflow-x-auto">
            <table className="w-full min-w-[280px] text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500">
                  <th className="py-1 pr-2 font-medium">Lens</th>
                  <th className="py-1 font-medium">Use</th>
                </tr>
              </thead>
              <tbody>
                {pack.lensPlan.map((row, i) => (
                  <tr key={i} className="border-b border-slate-100 text-slate-700">
                    <td className="py-1.5 pr-2 align-top font-medium text-violet-800">{row.lens}</td>
                    <td className="py-1.5 align-top">{row.use}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}

      {pack.dollyMoves?.length ? (
        <div>
          <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Dolly &amp; blocking plan
          </h4>
          <div className="mt-2 overflow-x-auto">
            <table className="w-full min-w-[480px] text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500">
                  <th className="py-1 pr-2 font-medium">Move</th>
                  <th className="py-1 pr-2 font-medium">Track</th>
                  <th className="py-1 pr-2 font-medium">Lens</th>
                  <th className="py-1 pr-2 font-medium">Purpose</th>
                  <th className="py-1 font-medium">Execution</th>
                </tr>
              </thead>
              <tbody>
                {pack.dollyMoves.map((row, i) => (
                  <tr key={i} className="border-b border-slate-100 text-slate-700">
                    <td className="py-1.5 pr-2 align-top font-semibold text-violet-800">{row.id}</td>
                    <td className="py-1.5 pr-2 align-top">{row.track}</td>
                    <td className="py-1.5 pr-2 align-top">{row.lens}</td>
                    <td className="py-1.5 pr-2 align-top">{row.purpose}</td>
                    <td className="py-1.5 align-top">{row.execution}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}

      {pack.blockingMap?.trim() ? (
        <div>
          <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-500">Blocking map</h4>
          <pre className="mt-2 overflow-x-auto rounded-lg bg-slate-50 p-3 font-mono text-xs leading-relaxed text-slate-700 whitespace-pre-wrap">
            {pack.blockingMap.trim()}
          </pre>
        </div>
      ) : null}

      {pack.cameraSetup?.length ? (
        <div>
          <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-500">Camera setup</h4>
          <div className="mt-2 overflow-x-auto">
            <table className="w-full min-w-[320px] text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500">
                  <th className="py-1 pr-2 font-medium">Setting</th>
                  <th className="py-1 pr-2 font-medium">Value</th>
                  <th className="py-1 font-medium">Why</th>
                </tr>
              </thead>
              <tbody>
                {pack.cameraSetup.map((row, i) => (
                  <tr key={i} className="border-b border-slate-100 text-slate-700">
                    <td className="py-1.5 pr-2 align-top font-medium">{row.setting}</td>
                    <td className="py-1.5 pr-2 align-top text-violet-800">{row.value}</td>
                    <td className="py-1.5 align-top text-slate-500">{row.why ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}

      {pack.editPlan?.length ? (
        <div>
          <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-500">Edit plan</h4>
          <ol className="mt-2 list-decimal space-y-1.5 pl-4 text-sm text-slate-700">
            {pack.editPlan.map((step, i) => (
              <li key={i}>
                <span className="font-medium text-violet-800">{String(step.step)}.</span> {step.action}
              </li>
            ))}
          </ol>
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
          <div className="mt-2 space-y-3">
            {script.suggestedShots.map((shot) => (
              <ScriptShotListCard key={`${shot.sceneNumber}-${shot.shotNumber}`} shot={shot} />
            ))}
          </div>
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
