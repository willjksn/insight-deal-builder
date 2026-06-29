"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useDocument } from "@/hooks/useDocument";
import { Project } from "@/lib/types";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { Button } from "@/components/ui/Button";
import { ProductionBoardClient } from "@/components/production/ProductionBoardClient";
import { useAuth } from "@/contexts/AuthContext";
import { useProjectAccess } from "@/hooks/useProjectAccess";
import { canManageProjects, canUseShotScout } from "@/lib/utils/permissions";

export default function ProductionBoardPage() {
  const params = useParams();
  const id = params.id as string;
  const { appUser } = useAuth();
  const { data: project, loading } = useDocument<Project>("projects", id);
  const projectAccess = useProjectAccess(id, project?.ownerUserId);

  const allowed =
    canUseShotScout(appUser) ||
    canManageProjects(appUser) ||
    projectAccess.canAccessProduction ||
    projectAccess.canAccessShots;

  if (loading || projectAccess.loading) return <LoadingSpinner className="py-20" />;

  if (!allowed) {
    return (
      <div className="py-20 text-center text-slate-500">
        <p>You don&apos;t have access to pre-production boards for this project.</p>
        <Link href={`/projects/${id}`}>
          <Button className="mt-4" variant="outline">Back</Button>
        </Link>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="py-20 text-center text-slate-500">
        <p>Project not found.</p>
        <Link href="/projects">
          <Button className="mt-4" variant="outline">Back</Button>
        </Link>
      </div>
    );
  }

  return <ProductionBoardClient project={project} />;
}
