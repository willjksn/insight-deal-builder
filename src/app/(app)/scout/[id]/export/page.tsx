"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, FileDown } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { ScoutShell, ScoutCard } from "@/components/scout/ScoutShell";
import { LightingAssignmentTable } from "@/components/scout/LightingAssignmentTable";
import { useAuth } from "@/contexts/AuthContext";
import { getScoutProject, createLightingRecipe } from "@/lib/firebase/scoutFirestore";
import { ScoutProject } from "@/lib/scout/types";
import { canUseShotScout } from "@/lib/utils/permissions";
import { downloadScoutPdf } from "@/lib/pdf/generateScoutPdf";

function downloadJson(filename: string, data: unknown) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export default function ScoutExportPage() {
  const params = useParams();
  const id = params.id as string;
  const { appUser, user } = useAuth();
  const [project, setProject] = useState<ScoutProject | null>(null);
  const [loading, setLoading] = useState(true);
  const [savingRecipe, setSavingRecipe] = useState(false);
  const [pdfLoading, setPdfLoading] = useState(false);

  useEffect(() => {
    getScoutProject(id)
      .then(setProject)
      .finally(() => setLoading(false));
  }, [id]);

  if (!canUseShotScout(appUser)) {
    return <div className="py-20 text-center text-slate-500">No access.</div>;
  }

  if (loading) return <LoadingSpinner className="py-20" />;
  if (!project) return <div className="py-20 text-center text-slate-500">Session not found.</div>;

  const analysis = project.latestAnalysis;
  const dp = project.latestDpPlan;
  const shots = project.latestShotList;
  const previews = project.latestPreviews ?? [];
  const isBeginner = project.skillLevel === "beginner";

  const exportPacket = {
    projectName: project.projectName,
    sceneType: project.sceneType,
    mood: project.mood,
    analysis,
    dpPlan: dp,
    shotList: shots,
    previews,
    exportedAt: new Date().toISOString(),
  };

  const saveRecipe = async () => {
    if (!user?.uid || !dp?.fixtureAwareLighting) return;
    setSavingRecipe(true);
    try {
      const fa = dp.fixtureAwareLighting;
      await createLightingRecipe(user.uid, {
        lookName: fa.lookName,
        mood: project.mood,
        camera: project.cameraBody ?? "Sony FX3",
        lens: dp.cameraSettings.lensRecommendation.split(" ")[0],
        frameRate: dp.cameraSettings.frameRate,
        pictureProfile: dp.cameraSettings.pictureProfileRecommendation,
        whiteBalance: fa.whiteBalanceRecommendation,
        lightAssignments: fa.assignments,
        powerRanges: fa.assignments.map((a) => a.powerStartingRange).join("; "),
        cctValues: fa.assignments.map((a) => a.cctStartingPoint).join("; "),
        modifiers: fa.assignments.map((a) => a.modifier).join("; "),
        subjectPosition: dp.blockingPlan.subjectStartingPosition,
        cameraPosition: dp.bestAngle,
        backgroundNotes: dp.backgroundRecommendations.join(". "),
        troubleshootingNotes: fa.troubleshooting.join(" "),
      });
    } finally {
      setSavingRecipe(false);
    }
  };

  return (
    <ScoutShell>
      <div className="mx-auto max-w-3xl px-4 pb-24">
        <Link href={`/scout/${id}`} className="mb-4 inline-flex items-center text-sm text-sky-600 hover:text-sky-800">
          <ArrowLeft className="mr-1 h-4 w-4" />
          Back to session
        </Link>

        <div className="mb-6 flex items-center gap-2">
          <FileDown className="h-5 w-5 text-sky-600" />
          <h1 className="text-xl font-bold text-slate-900">Export DP packet</h1>
        </div>

        <ScoutCard>
          <ul className="space-y-2 text-sm text-slate-700">
            <li>{analysis ? "✓ Location analysis & best angle" : "○ Location analysis"}</li>
            <li>{dp ? "✓ Full DP plan + camera settings" : "○ DP plan"}</li>
            <li>{dp?.fixtureAwareLighting ? "✓ Fixture assignment table" : "○ Fixture lighting"}</li>
            <li>{shots ? "✓ Shot list" : "○ Shot list"}</li>
            <li>{dp?.onSetWorkflow?.length ? "✓ Rehearsal / on-set checklist" : "○ Checklist"}</li>
            <li>{previews.some((p) => p.imageUrl) ? "✓ Previs images" : previews.length ? "○ Previs (prompts only)" : "○ Previs"}</li>
          </ul>
          <div className="mt-4 flex flex-wrap gap-2">
            <Button
              disabled={!dp || pdfLoading}
              onClick={() => {
                setPdfLoading(true);
                void downloadScoutPdf(project).finally(() => setPdfLoading(false));
              }}
            >
              {pdfLoading ? "Building PDF…" : "Download PDF packet"}
            </Button>
            <Button
              variant="outline"
              disabled={!dp}
              onClick={() => downloadJson(`${project.projectName.replace(/\s+/g, "-")}-dp-plan.json`, exportPacket)}
            >
              Download JSON packet
            </Button>
            {dp?.fixtureAwareLighting && (
              <Button
                variant="secondary"
                disabled={savingRecipe}
                onClick={() => void saveRecipe()}
              >
                {savingRecipe ? "Saving…" : "Save as lighting recipe"}
              </Button>
            )}
          </div>
          {!dp && (
            <p className="mt-3 text-xs text-slate-500">Generate a DP plan on the session page before exporting.</p>
          )}
        </ScoutCard>

        {dp?.fixtureAwareLighting && (
          <div className="mt-8">
            <h2 className="mb-4 font-semibold text-slate-900">Fixture assignment preview</h2>
            <LightingAssignmentTable plan={dp.fixtureAwareLighting} showBeginner={isBeginner} />
          </div>
        )}
      </div>
    </ScoutShell>
  );
}
