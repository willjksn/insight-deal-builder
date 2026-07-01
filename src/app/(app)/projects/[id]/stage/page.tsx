"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { Button } from "@/components/ui/Button";
import { StagePlanner } from "@/components/stage/StagePlanner";
import { useAuth } from "@/contexts/AuthContext";
import { useDocument } from "@/hooks/useDocument";
import { useProjectAccess } from "@/hooks/useProjectAccess";
import { ensureProjectStageBoard } from "@/lib/stage/stageFirestore";
import { StageBoard } from "@/lib/stage/types";
import { Project } from "@/lib/types";
import { canManageProjects, canUseShotScout } from "@/lib/utils/permissions";

export default function ProjectStagePlannerPage() {
  const params = useParams();
  const projectId = params.id as string;
  const { user, appUser } = useAuth();
  const { data: project, loading: projectLoading } = useDocument<Project>("projects", projectId);
  const projectAccess = useProjectAccess(projectId, project?.ownerUserId);
  const [board, setBoard] = useState<StageBoard | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const allowed =
    canManageProjects(appUser) ||
    canUseShotScout(appUser) ||
    projectAccess.canAccessProduction ||
    projectAccess.canAccessShots;

  useEffect(() => {
    if (!user || !project || !allowed) return;
    ensureProjectStageBoard(user.uid, projectId, project.projectName)
      .then(setBoard)
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load"))
      .finally(() => setLoading(false));
  }, [user, project, projectId, allowed]);

  if (projectLoading || loading) return <LoadingSpinner className="py-20" />;

  if (!allowed) {
    return (
      <div className="py-20 text-center text-slate-500">
        <p>Access denied.</p>
        <Link href={`/projects/${projectId}`}>
          <Button className="mt-4" variant="outline">
            Back
          </Button>
        </Link>
      </div>
    );
  }

  if (!project || !board) {
    return (
      <div className="py-20 text-center text-slate-500">
        <p>{error ?? "Stage planner not found."}</p>
      </div>
    );
  }

  return (
    <div className="pb-24">
      <PageHeader
        title={`Stage planner — ${project.projectName}`}
        subtitle="Shared with your project team. Drag lights, flags, diffusers, furniture; add camera/light note boxes."
        action={
          <div className="flex gap-2">
            <Link href="/reference">
              <Button size="touch" variant="outline">
                Reference guide
              </Button>
            </Link>
            <Link href={`/projects/${projectId}`}>
              <Button size="touch" variant="outline">
                <ArrowLeft className="mr-2 h-5 w-5" />
                Project
              </Button>
            </Link>
          </div>
        }
      />
      <StagePlanner board={board} onBoardChange={setBoard} />
    </div>
  );
}
