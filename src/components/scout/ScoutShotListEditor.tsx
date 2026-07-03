"use client";

import { useEffect, useMemo, useState } from "react";
import { Loader2, Plus, Save, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";
import { ScoutShotListFieldSelect } from "@/components/scout/ScoutShotListFieldSelect";
import { useAuth } from "@/contexts/AuthContext";
import { getGearList, getGearProfiles } from "@/lib/firebase/scoutFirestore";
import { scoutSaveShotList } from "@/lib/scout/apiClient";
import { buildGearInventory } from "@/lib/scout/gearContext";
import {
  buildLensSelectOptions,
  buildMovementSelectOptions,
  formatStoredMovement,
  normalizeShotListRow,
  shotListsEqual,
} from "@/lib/scout/shotListFieldOptions";
import { ScoutGearList, ScoutGearProfile, ScoutProject, ScoutShotListItem, ScoutShotType } from "@/lib/scout/types";

const SHOT_TYPES: ScoutShotType[] = [
  "master_wide",
  "medium_shot",
  "close_up",
  "insert_shot",
  "reaction_shot",
  "movement_shot",
  "vertical_social_shot",
  "thumbnail_shot",
  "bts_shot",
  "room_tone",
  "wild_line",
];

const PRIORITIES: ScoutShotListItem["priority"][] = ["must_have", "nice_to_have", "optional"];

function emptyShot(sortOrder: number): ScoutShotListItem {
  return {
    shotNumber: sortOrder + 1,
    scene: "Scene 1",
    shotType: "medium_shot",
    camera: "",
    lens: "",
    frameRate: "24fps",
    cameraMovement: "",
    subjectAction: "",
    blockingNotes: "",
    lightingNotes: "",
    audioDialogueNotes: "",
    priority: "must_have",
    status: "planned",
    notes: "",
  };
}

interface ScoutShotListEditorProps {
  scoutId: string;
  scoutProject: ScoutProject;
  shots: ScoutShotListItem[];
  onSaved: (shots: ScoutShotListItem[]) => void | Promise<void>;
  readOnly?: boolean;
}

export function ScoutShotListEditor({
  scoutId,
  scoutProject,
  shots: initial,
  onSaved,
  readOnly,
}: ScoutShotListEditorProps) {
  const { user } = useAuth();
  const [rows, setRows] = useState(initial);
  const [baseline, setBaseline] = useState(initial);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [gearProfiles, setGearProfiles] = useState<ScoutGearProfile[]>([]);
  const [gearList, setGearList] = useState<ScoutGearList | null>(null);

  const initialSnapshot = useMemo(
    () => JSON.stringify(initial.map(normalizeShotListRow)),
    [initial]
  );

  useEffect(() => {
    setRows(initial);
    setBaseline(initial);
  }, [initial, initialSnapshot]);

  const dirty = useMemo(() => !shotListsEqual(rows, baseline), [rows, baseline]);

  useEffect(() => {
    if (!user?.uid) return;
    Promise.all([getGearProfiles(user.uid), getGearList(user.uid)])
      .then(([profiles, list]) => {
        setGearProfiles(profiles);
        setGearList(list);
      })
      .catch(() => {
        setGearProfiles([]);
        setGearList(null);
      });
  }, [user?.uid]);

  const gearProfile = useMemo(
    () => gearProfiles.find((p) => p.id === scoutProject.selectedGearProfileId),
    [gearProfiles, scoutProject.selectedGearProfileId]
  );

  const lensInventory = useMemo(
    () => buildGearInventory(scoutProject, gearProfile, gearList).lenses,
    [scoutProject, gearProfile, gearList]
  );

  const lensOptions = useMemo(() => buildLensSelectOptions(lensInventory), [lensInventory]);

  const movementOptions = useMemo(
    () => buildMovementSelectOptions(scoutProject.creativeBrief),
    [scoutProject.creativeBrief]
  );

  const patch = (index: number, patch: Partial<ScoutShotListItem>) => {
    setRows((prev) => {
      const current = prev[index];
      if (!current) return prev;
      const updated = { ...current, ...patch };
      if (
        JSON.stringify(normalizeShotListRow(current)) ===
        JSON.stringify(normalizeShotListRow(updated))
      ) {
        return prev;
      }
      return prev.map((r, i) => (i === index ? updated : r));
    });
  };

  const remove = (index: number) => {
    setRows((prev) => prev.filter((_, i) => i !== index).map((r, i) => ({ ...r, shotNumber: i + 1 })));
  };

  const add = () => {
    setRows((prev) => [...prev, emptyShot(prev.length)]);
  };

  const save = async () => {
    setSaving(true);
    setError(null);
    try {
      const { shotList } = await scoutSaveShotList(scoutId, rows);
      const saved = shotList.shots;
      setRows(saved);
      setBaseline(saved);
      await onSaved(saved);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  if (readOnly) {
    return (
      <table className="min-w-full text-sm">
        <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
          <tr>
            <th className="px-4 py-3">#</th>
            <th className="px-4 py-3">Type</th>
            <th className="px-4 py-3">Lens</th>
            <th className="px-4 py-3">Movement</th>
            <th className="px-4 py-3">Action</th>
            <th className="px-4 py-3">Priority</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((s) => (
            <tr key={s.shotNumber} className="border-t border-slate-100">
              <td className="px-4 py-3 tabular-nums">{s.shotNumber}</td>
              <td className="px-4 py-3">{s.shotType.replace(/_/g, " ")}</td>
              <td className="px-4 py-3">{s.lens || "—"}</td>
              <td className="px-4 py-3">{formatStoredMovement(s.cameraMovement)}</td>
              <td className="px-4 py-3 max-w-xs">{s.subjectAction}</td>
              <td className="px-4 py-3 capitalize">{s.priority.replace(/_/g, " ")}</td>
            </tr>
          ))}
        </tbody>
      </table>
    );
  }

  return (
    <div className="space-y-3">
      {error && (
        <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
      )}
      <div className="flex flex-wrap gap-2">
        <Button type="button" size="sm" variant="outline" onClick={add}>
          <Plus className="mr-1.5 h-4 w-4" />
          Add shot
        </Button>
        <Button type="button" size="sm" disabled={!dirty || saving} onClick={() => void save()}>
          {saving ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Save className="mr-1.5 h-4 w-4" />}
          Save shot list
        </Button>
        {dirty && <span className="self-center text-xs text-amber-700">Unsaved changes</span>}
      </div>
      <div className="space-y-3">
        {rows.map((shot, index) => (
          <div key={`${shot.shotNumber}-${index}`} className="rounded-xl border border-slate-200 p-3 space-y-2">
            <div className="flex items-center justify-between gap-2">
              <span className="text-sm font-semibold text-slate-800">Shot {index + 1}</span>
              <button
                type="button"
                className="text-slate-400 hover:text-red-600"
                onClick={() => remove(index)}
                aria-label="Remove shot"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              <Select
                label="Type"
                value={shot.shotType}
                onChange={(e) => patch(index, { shotType: e.target.value as ScoutShotType })}
                options={SHOT_TYPES.map((t) => ({ value: t, label: t.replace(/_/g, " ") }))}
              />
              <ScoutShotListFieldSelect
                label="Lens"
                value={shot.lens}
                options={lensOptions}
                customPlaceholder="e.g. 35mm f/1.4"
                onChange={(lens) => patch(index, { lens })}
              />
              <ScoutShotListFieldSelect
                label="Movement"
                value={shot.cameraMovement}
                options={movementOptions}
                customPlaceholder="Describe camera movement"
                onChange={(cameraMovement) => patch(index, { cameraMovement })}
              />
              <Input
                label="Scene"
                value={shot.scene}
                onChange={(e) => patch(index, { scene: e.target.value })}
              />
              <Select
                label="Priority"
                value={shot.priority}
                onChange={(e) =>
                  patch(index, { priority: e.target.value as ScoutShotListItem["priority"] })
                }
                options={PRIORITIES.map((p) => ({ value: p, label: p.replace(/_/g, " ") }))}
              />
            </div>
            <Textarea
              label="Subject / action"
              value={shot.subjectAction}
              onChange={(e) => patch(index, { subjectAction: e.target.value })}
              rows={2}
              className="min-h-[3.5rem] resize-y leading-snug"
            />
            <Textarea
              label="Notes"
              value={shot.notes}
              onChange={(e) => patch(index, { notes: e.target.value })}
              rows={3}
              className="min-h-[4.5rem] resize-y leading-snug"
            />
          </div>
        ))}
      </div>
    </div>
  );
}
