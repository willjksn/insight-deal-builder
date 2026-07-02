"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { ScoutShell, ScoutCard } from "@/components/scout/ScoutShell";
import { useAuth } from "@/contexts/AuthContext";
import { getScoutProject, updateScoutProject } from "@/lib/firebase/scoutFirestore";
import {
  SCOUT_ASPECT_RATIOS,
  SCOUT_CAMERA_MOVEMENTS,
  SCOUT_MOODS,
  SCOUT_PLATFORMS,
} from "@/lib/scout/constants";
import {
  readCameraMovementsFromBrief,
  toggleCameraMovement,
  withCameraMovements,
} from "@/lib/scout/cameraMovementBrief";
import { ScoutCreativeBrief, ScoutMood, ScoutPlatform, ScoutAspectRatio } from "@/lib/scout/types";
import { canUseShotScout } from "@/lib/utils/permissions";
import { cn } from "@/lib/utils/cn";

const SUBJECT_POSES = [
  { value: "sitting", label: "Sitting" },
  { value: "standing", label: "Standing" },
  { value: "walking", label: "Walking" },
  { value: "cooking", label: "Cooking" },
  { value: "talking", label: "Talking" },
  { value: "looking_at_camera", label: "Looking at camera" },
];

export default function ScoutQuestionsPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const { appUser } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [brief, setBrief] = useState<ScoutCreativeBrief>({});
  const [mood, setMood] = useState<ScoutMood>("natural");
  const [platform, setPlatform] = useState<ScoutPlatform>("instagram_reels");
  const [aspectRatio, setAspectRatio] = useState<ScoutAspectRatio>("9:16");

  useEffect(() => {
    getScoutProject(id)
      .then((p) => {
        if (p?.creativeBrief) {
          setBrief(
            withCameraMovements(
              p.creativeBrief,
              readCameraMovementsFromBrief(p.creativeBrief)
            )
          );
        }
        if (p?.mood) setMood(p.mood);
        if (p?.platform) setPlatform(p.platform);
        if (p?.aspectRatio) setAspectRatio(p.aspectRatio);
      })
      .finally(() => setLoading(false));
  }, [id]);

  if (!canUseShotScout(appUser)) {
    return <div className="py-20 text-center text-slate-500">No access.</div>;
  }

  const save = async () => {
    setSaving(true);
    try {
      await updateScoutProject(id, {
        creativeBrief: withCameraMovements(
          { ...brief, completedAt: new Date().toISOString() },
          readCameraMovementsFromBrief(brief)
        ),
        mood,
        platform,
        aspectRatio,
        status: "ready_to_plan",
      });
      router.push(`/scout/${id}/lighting`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <ScoutShell>
      <div className="mx-auto max-w-2xl px-4 pb-24">
        <Link href={`/scout/${id}`} className="mb-4 inline-flex items-center text-sm text-sky-600 hover:text-sky-800">
          <ArrowLeft className="mr-1 h-4 w-4" />
          Back to session
        </Link>
        <div className="mb-2 h-1 w-10 rounded-full bg-gradient-to-r from-sky-400 to-blue-500" />
        <h1 className="text-xl font-bold text-slate-900">Creative questions</h1>
        <p className="mt-2 text-sm text-slate-600">
          Answer these before generating your full DP plan. Beginner-friendly explanations are included in
          the plan based on your skill level.
        </p>

        {loading ? (
          <LoadingSpinner className="py-16" />
        ) : (
          <ScoutCard className="mt-6 space-y-4">
            <Input
              label="What is the subject doing in the scene?"
              value={brief.subjectAction ?? ""}
              onChange={(e) => setBrief({ ...brief, subjectAction: e.target.value })}
            />
            <Input
              label="How many people are in the scene?"
              type="number"
              min={1}
              value={brief.peopleCount ?? ""}
              onChange={(e) =>
                setBrief({ ...brief, peopleCount: e.target.value ? Number(e.target.value) : undefined })
              }
            />
            <Select
              label="Subject pose / action"
              value={brief.subjectPose ?? ""}
              onChange={(e) => setBrief({ ...brief, subjectPose: e.target.value })}
              options={[{ value: "", label: "Select…" }, ...SUBJECT_POSES]}
            />
            <Select label="Mood" value={mood} onChange={(e) => setMood(e.target.value as ScoutMood)} options={SCOUT_MOODS} />
            <Select
              label="Platform"
              value={platform}
              onChange={(e) => setPlatform(e.target.value as ScoutPlatform)}
              options={SCOUT_PLATFORMS}
            />
            <Select
              label="Aspect ratio"
              value={aspectRatio}
              onChange={(e) => setAspectRatio(e.target.value as ScoutAspectRatio)}
              options={SCOUT_ASPECT_RATIOS}
            />
            <div className="w-full">
              <p className="mb-1.5 block text-sm font-medium text-slate-700">Camera movement</p>
              <p className="mb-2 text-xs text-slate-500">Select all that apply.</p>
              <div className="flex flex-wrap gap-2">
                {SCOUT_CAMERA_MOVEMENTS.map(({ value, label }) => {
                  const selected = readCameraMovementsFromBrief(brief).includes(value);
                  return (
                    <button
                      key={value}
                      type="button"
                      aria-pressed={selected}
                      onClick={() =>
                        setBrief((prev) =>
                          withCameraMovements(
                            prev,
                            toggleCameraMovement(readCameraMovementsFromBrief(prev), value)
                          )
                        )
                      }
                      className={cn(
                        "rounded-full border px-3 py-2 text-sm font-medium transition-colors",
                        selected
                          ? "border-sky-500 bg-sky-50 text-sky-900 ring-1 ring-sky-200"
                          : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50"
                      )}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
            </div>
            <label className="flex items-center gap-2 text-sm text-slate-700">
              <input
                type="checkbox"
                checked={brief.avoidHeavyGrading ?? false}
                onChange={(e) => setBrief({ ...brief, avoidHeavyGrading: e.target.checked })}
                className="rounded border-slate-300"
              />
              Trying to avoid heavy color grading (prefer S-Cinetone / minimal grade)
            </label>
          </ScoutCard>
        )}

        <Button
          className="mt-6"
          disabled={saving || !brief.subjectAction?.trim()}
          onClick={() => void save()}
        >
          Save & choose lights →
        </Button>
      </div>
    </ScoutShell>
  );
}
