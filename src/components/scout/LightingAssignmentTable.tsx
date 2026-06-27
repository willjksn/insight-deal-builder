"use client";

import { FixtureAwareLightingPlan } from "@/lib/scout/types";
import { ScoutCard } from "./ScoutShell";

interface Props {
  plan: FixtureAwareLightingPlan;
  showBeginner?: boolean;
}

export function LightingAssignmentTable({ plan, showBeginner }: Props) {
  return (
    <div className="space-y-4">
      <ScoutCard>
        <h3 className="font-semibold text-slate-900">{plan.lookName}</h3>
        <p className="mt-2 text-sm text-slate-600">{plan.lightingMotivation}</p>
        <p className="mt-2 text-xs font-medium text-sky-700">White balance: {plan.whiteBalanceRecommendation}</p>
        <p className="mt-1 text-xs text-slate-500">Contrast: {plan.contrastLevel}</p>
      </ScoutCard>

      <ScoutCard className="overflow-x-auto p-0">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
            <tr>
              <th className="px-3 py-2">Role</th>
              <th className="px-3 py-2">Fixture</th>
              <th className="px-3 py-2">Placement</th>
              <th className="px-3 py-2">Power</th>
              <th className="px-3 py-2">CCT</th>
              <th className="px-3 py-2">Modifier</th>
            </tr>
          </thead>
          <tbody>
            {plan.assignments.map((a, i) => (
              <tr key={`${a.role}-${i}`} className="border-t border-slate-100">
                <td className="px-3 py-2 capitalize font-medium text-sky-700">{a.role.replace(/_/g, " ")}</td>
                <td className="px-3 py-2 text-slate-900">{a.fixtureName}</td>
                <td className="px-3 py-2 max-w-xs text-slate-600">
                  {a.placement}
                  <span className="block text-xs text-slate-400">{a.height} · {a.distanceEstimate}</span>
                </td>
                <td className="px-3 py-2 text-slate-600">{a.powerStartingRange}</td>
                <td className="px-3 py-2 text-slate-600">{a.cctStartingPoint}</td>
                <td className="px-3 py-2 text-slate-600">{a.modifier}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </ScoutCard>

      <ScoutCard>
        <h4 className="text-sm font-semibold text-slate-900">Why each light</h4>
        <ul className="mt-2 space-y-2 text-sm text-slate-600">
          {plan.assignments.map((a, i) => (
            <li key={i}>
              <span className="font-medium text-slate-800 capitalize">{a.role.replace(/_/g, " ")}:</span>{" "}
              {a.reasonChosen}
            </li>
          ))}
        </ul>
      </ScoutCard>

      {showBeginner && (
        <ScoutCard className="border-sky-200 bg-sky-50/50 ring-1 ring-sky-100">
          <p className="text-sm text-sky-900">{plan.beginnerExplanation}</p>
        </ScoutCard>
      )}

      <ScoutCard>
        <h4 className="text-sm font-semibold text-slate-900">Turn off</h4>
        <ul className="mt-2 list-inside list-disc text-sm text-slate-600">
          {plan.lightsToTurnOff.map((l) => (
            <li key={l}>{l}</li>
          ))}
        </ul>
        <h4 className="mt-4 text-sm font-semibold text-slate-900">Safety</h4>
        <ul className="mt-2 list-inside list-disc text-sm text-slate-600">
          {plan.safetyNotes.map((n) => (
            <li key={n}>{n}</li>
          ))}
        </ul>
        <h4 className="mt-4 text-sm font-semibold text-slate-900">Troubleshooting</h4>
        <ul className="mt-2 list-inside list-disc text-sm text-slate-600">
          {plan.troubleshooting.map((t) => (
            <li key={t}>{t}</li>
          ))}
        </ul>
      </ScoutCard>
    </div>
  );
}
