"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Download, Loader2, Sparkles, FolderInput } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Select";
import { useAccessibleProjects } from "@/hooks/useAccessibleProjects";
import {
  createProjectFromContentPlan,
  downloadContentPlanExport,
  refineContentPlan,
} from "@/lib/contentPlan/apiClient";
import {
  downloadContentPlanOnePagerPdf,
  downloadContentPlanPdf,
} from "@/lib/contentPlan/exportPdf";
import {
  refineTargetFromSection,
  type RefineTarget,
} from "@/lib/contentPlan/refineTypes";
import type { ContentPlan, ContentPlanSection } from "@/lib/contentPlan/types";

type GetToken = () => Promise<string | null>;

const REFINE_OPTIONS: { value: RefineTarget; label: string }[] = [
  { value: "brief", label: "Creative brief" },
  { value: "beats", label: "Story beats" },
  { value: "script", label: "Script" },
  { value: "shots", label: "All shots" },
  { value: "shot", label: "One shot" },
  { value: "edit", label: "Edit map" },
  { value: "sound", label: "Sound" },
  { value: "music", label: "Music" },
  { value: "look", label: "Look" },
  { value: "lighting", label: "Lighting" },
  { value: "coverage", label: "Coverage" },
  { value: "shoot_order", label: "Shoot order" },
  { value: "checklist", label: "Checklist" },
];

export function ContentPlanPhase5Bar({
  plan,
  section,
  getToken,
  onPlanUpdated,
  onError,
}: {
  plan: ContentPlan;
  section: ContentPlanSection;
  getToken: GetToken;
  onPlanUpdated: (plan: ContentPlan, links?: { projectId: string; scriptSessionId: string }) => void;
  onError: (message: string) => void;
}) {
  const router = useRouter();
  const { projects, loading: projectsLoading } = useAccessibleProjects();
  const [instruction, setInstruction] = useState("");
  const [target, setTarget] = useState<RefineTarget>(
    () => refineTargetFromSection(section) || "shots"
  );
  const [shotId, setShotId] = useState(plan.shots?.[0]?.id || "");
  const [existingProjectId, setExistingProjectId] = useState("");
  const [busyRefine, setBusyRefine] = useState(false);
  const [busyExport, setBusyExport] = useState(false);
  const [busyApply, setBusyApply] = useState(false);

  useEffect(() => {
    const next = refineTargetFromSection(section);
    if (next) setTarget(next);
  }, [section]);

  const shotOptions = useMemo(
    () =>
      (plan.shots || []).map((s) => ({
        value: s.id,
        label: `Shot ${String(s.shotNumber).padStart(2, "0")} — ${s.shotName}`,
      })),
    [plan.shots]
  );

  const projectOptions = useMemo(
    () => [
      { value: "", label: "Select a project…" },
      ...projects.map((p) => ({ value: p.id, label: p.projectName || p.id })),
    ],
    [projects]
  );

  async function onRefine() {
    if (!instruction.trim()) {
      onError("Describe what to change, e.g. “Make Shot 4 more intimate.”");
      return;
    }
    setBusyRefine(true);
    try {
      const { plan: next } = await refineContentPlan(getToken, plan.id, {
        instruction: instruction.trim(),
        target,
        shotId: target === "shot" ? shotId : undefined,
      });
      onPlanUpdated(next);
      setInstruction("");
    } catch (e) {
      onError(e instanceof Error ? e.message : "Refine failed");
    } finally {
      setBusyRefine(false);
    }
  }

  async function onExport(format: "json" | "text") {
    setBusyExport(true);
    try {
      await downloadContentPlanExport(getToken, plan.id, format);
    } catch (e) {
      onError(e instanceof Error ? e.message : "Export failed");
    } finally {
      setBusyExport(false);
    }
  }

  function onExportPdf() {
    setBusyExport(true);
    try {
      downloadContentPlanPdf(plan);
    } catch (e) {
      onError(e instanceof Error ? e.message : "PDF export failed");
    } finally {
      setBusyExport(false);
    }
  }

  function onExportOnePager() {
    setBusyExport(true);
    try {
      downloadContentPlanOnePagerPdf(plan);
    } catch (e) {
      onError(e instanceof Error ? e.message : "One-pager export failed");
    } finally {
      setBusyExport(false);
    }
  }

  async function onApplyExisting() {
    if (!existingProjectId) {
      onError("Choose a project to apply into.");
      return;
    }
    if (!plan.shots?.length) {
      onError("Generate shots before applying to a production board.");
      return;
    }
    setBusyApply(true);
    try {
      const result = await createProjectFromContentPlan(getToken, plan.id, {
        existingProjectId,
        projectName: plan.creativeBrief?.workingTitle || plan.title,
      });
      onPlanUpdated(result.plan, {
        projectId: result.projectId,
        scriptSessionId: result.scriptSessionId,
      });
      router.push(`/projects/${result.projectId}/production`);
    } catch (e) {
      onError(e instanceof Error ? e.message : "Apply to board failed");
    } finally {
      setBusyApply(false);
    }
  }

  return (
    <div className="space-y-3 rounded-xl border border-slate-200 bg-white px-3 py-3">
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
          Refine with natural language
        </p>
        <div className="mt-2 grid gap-2 sm:grid-cols-[160px_minmax(0,1fr)]">
          <Select
            value={target}
            onChange={(e) => setTarget(e.target.value as RefineTarget)}
            options={REFINE_OPTIONS}
          />
          {target === "shot" ? (
            <Select
              value={shotId}
              onChange={(e) => setShotId(e.target.value)}
              options={
                shotOptions.length
                  ? shotOptions
                  : [{ value: "", label: "No shots yet" }]
              }
            />
          ) : (
            <input
              value={instruction}
              onChange={(e) => setInstruction(e.target.value)}
              placeholder='e.g. “Use only FX3 + 35mm” or “Make the edit more aggressive”'
              className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none ring-sky-200 focus:ring-2"
            />
          )}
        </div>
        {target === "shot" ? (
          <input
            value={instruction}
            onChange={(e) => setInstruction(e.target.value)}
            placeholder='e.g. “Make this shot more intimate — tighter framing, less movement”'
            className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none ring-sky-200 focus:ring-2"
          />
        ) : null}
        <Button
          type="button"
          size="sm"
          className="mt-2"
          disabled={busyRefine}
          onClick={() => void onRefine()}
        >
          {busyRefine ? (
            <>
              <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
              Refining…
            </>
          ) : (
            <>
              <Sparkles className="mr-1.5 h-3.5 w-3.5" />
              Apply change
            </>
          )}
        </Button>
      </div>

      <div className="flex flex-wrap items-end gap-2 border-t border-slate-100 pt-3">
        <div className="min-w-[200px] flex-1">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
            Apply to existing production board
          </p>
          <Select
            value={existingProjectId}
            onChange={(e) => setExistingProjectId(e.target.value)}
            options={
              projectsLoading
                ? [{ value: "", label: "Loading projects…" }]
                : projectOptions
            }
          />
          <p className="mt-1 text-[11px] text-slate-500">
            Merges plan shots onto the board (keeps board shot IDs when shot numbers match), then
            opens the board.
          </p>
        </div>
        <Button
          type="button"
          size="sm"
          variant="secondary"
          disabled={busyApply || !plan.shots?.length}
          onClick={() => void onApplyExisting()}
        >
          {busyApply ? (
            <>
              <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
              Applying…
            </>
          ) : (
            <>
              <FolderInput className="mr-1.5 h-3.5 w-3.5" />
              Apply to board
            </>
          )}
        </Button>
        <Button
          type="button"
          size="sm"
          variant="secondary"
          disabled={busyExport}
          onClick={() => void onExport("text")}
        >
          <Download className="mr-1.5 h-3.5 w-3.5" />
          Export printable
        </Button>
        <Button
          type="button"
          size="sm"
          variant="secondary"
          disabled={busyExport}
          onClick={() => onExportPdf()}
        >
          <Download className="mr-1.5 h-3.5 w-3.5" />
          Export PDF
        </Button>
        <Button
          type="button"
          size="sm"
          variant="secondary"
          disabled={busyExport}
          onClick={() => onExportOnePager()}
        >
          <Download className="mr-1.5 h-3.5 w-3.5" />
          On-set one-pager
        </Button>
      </div>
    </div>
  );
}
