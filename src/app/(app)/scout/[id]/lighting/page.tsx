"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Lightbulb } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Textarea } from "@/components/ui/Textarea";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { ScoutShell, ScoutCard } from "@/components/scout/ScoutShell";
import { useAuth } from "@/contexts/AuthContext";
import {
  getLightFixtures,
  getScoutProject,
  updateScoutProject,
} from "@/lib/firebase/scoutFirestore";
import { LightFixture } from "@/lib/scout/types";
import { WINDOW_DAYLIGHT_FIXTURE, WINDOW_DAYLIGHT_ID } from "@/lib/scout/mockFixtures";
import { canUseShotScout } from "@/lib/utils/permissions";
import { cn } from "@/lib/utils/cn";

export default function ScoutLightingSelectionPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const { user, appUser } = useAuth();
  const [fixtures, setFixtures] = useState<LightFixture[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [sceneNotes, setSceneNotes] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const refresh = useCallback(async () => {
    if (!user?.uid) return;
    const [project, list] = await Promise.all([
      getScoutProject(id),
      getLightFixtures(user.uid),
    ]);
    setFixtures(list);
    const ids = project?.selectedLightFixtureIds ?? [];
    setSelected(new Set(ids.length ? ids : list.slice(0, 2).map((f) => f.id)));
    if (ids.includes(WINDOW_DAYLIGHT_ID) || ids.length === 0) {
      setSelected((prev) => new Set([...prev, WINDOW_DAYLIGHT_ID]));
    }
    setSceneNotes(project?.sceneLightNotes ?? "");
  }, [id, user?.uid]);

  useEffect(() => {
    setLoading(true);
    refresh().finally(() => setLoading(false));
  }, [refresh]);

  if (!canUseShotScout(appUser)) {
    return <div className="py-20 text-center text-slate-500">No access.</div>;
  }

  const toggle = (fixtureId: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(fixtureId)) next.delete(fixtureId);
      else next.add(fixtureId);
      return next;
    });
  };

  const save = async () => {
    if (!user?.uid) return;
    setSaving(true);
    try {
      await updateScoutProject(id, {
        selectedLightFixtureIds: [...selected],
        sceneLightNotes: sceneNotes.trim() || undefined,
        status: "ready_to_plan",
      });
      router.push(`/scout/${id}`);
    } finally {
      setSaving(false);
    }
  };

  const allOptions = [WINDOW_DAYLIGHT_FIXTURE, ...fixtures];

  return (
    <ScoutShell>
      <div className="mx-auto max-w-3xl px-4 pb-24">
        <Link href={`/scout/${id}`} className="mb-4 inline-flex items-center text-sm text-sky-600 hover:text-sky-800">
          <ArrowLeft className="mr-1 h-4 w-4" />
          Back to session
        </Link>

        <div className="mb-6 flex items-center gap-2 text-sky-600">
          <Lightbulb className="h-5 w-5" />
          <h1 className="text-xl font-bold text-slate-900">Scene lighting selection</h1>
        </div>
        <p className="mb-6 text-sm text-slate-600">
          Choose which saved lights are available for this scene. The DP plan assigns each fixture to a
          specific role using your actual gear.
        </p>

        {loading ? (
          <LoadingSpinner className="py-16" />
        ) : fixtures.length === 0 ? (
          <ScoutCard>
            <p className="text-sm text-slate-600">No saved fixtures yet.</p>
            <Link href="/settings/lights" className="mt-3 inline-block text-sky-600 hover:underline">
              Add lighting gear →
            </Link>
          </ScoutCard>
        ) : (
          <div className="space-y-3">
            {allOptions.map((f) => {
              const on = selected.has(f.id);
              return (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => toggle(f.id)}
                  className={cn(
                    "w-full rounded-xl border p-4 text-left transition",
                    on
                      ? "border-sky-400 bg-sky-50 ring-1 ring-sky-200"
                      : "border-slate-200 bg-white hover:border-sky-300"
                  )}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-slate-900">
                      {f.brand} {f.model}
                    </span>
                    <span className={cn("text-xs font-medium", on ? "text-sky-700" : "text-slate-500")}>
                      {on ? "Included" : "Tap to include"}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-slate-500 capitalize">
                    {f.colorType.replace(/_/g, " ")}
                    {f.fixedCct ? ` · ${f.fixedCct}K` : f.cctMin && f.cctMax ? ` · ${f.cctMin}–${f.cctMax}K` : ""}
                  </p>
                  <p className="mt-1 text-xs text-slate-600">
                    Modifiers: {f.modifiersOwned?.join(", ") || "—"} · Best: {f.bestUses?.join(", ")}
                  </p>
                </button>
              );
            })}
          </div>
        )}

        <ScoutCard className="mt-6">
          <Textarea
            label="Notes for this scene"
            value={sceneNotes}
            onChange={(e) => setSceneNotes(e.target.value)}
            placeholder="e.g. Warm kitchen — dim overhead, use practical on counter"
          />
        </ScoutCard>

        <Button
          className="mt-6"
          disabled={saving || selected.size === 0}
          onClick={() => void save()}
        >
          Save & continue
        </Button>
      </div>
    </ScoutShell>
  );
}
