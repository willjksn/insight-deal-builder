"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { FileText, Plus, LayoutGrid, ScrollText, ArrowRight } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardBody } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { useDocument } from "@/hooks/useDocument";
import { useAgreements } from "@/hooks/useAgreements";
import { useAuth } from "@/contexts/AuthContext";
import { formatDate } from "@/lib/utils/format";
import { Project } from "@/lib/types";
import { ProductionBoard } from "@/lib/production/types";
import { ScriptWriterSession } from "@/lib/scriptWriter/types";
import { getProductionBoardByProject } from "@/lib/firebase/productionFirestore";
import { scriptWriterListSessions } from "@/lib/scriptWriter/apiClient";
import { ProjectSpine } from "@/components/projects/ProjectSpine";
import { ProjectShotProgressCard } from "@/components/projects/ProjectShotProgressCard";
import { useProjectAccess } from "@/hooks/useProjectAccess";
import {
  canCreateQuotes,
  canUseProductionTools,
  canManageProjects,
  canManageUsers,
} from "@/lib/utils/permissions";

function pickProjectScriptSession(
  sessions: ScriptWriterSession[],
  projectId: string,
  board: ProductionBoard | null
): ScriptWriterSession | undefined {
  if (board?.scriptSessionId) {
    const fromBoard = sessions.find((s) => s.id === board.scriptSessionId);
    if (fromBoard) return fromBoard;
  }

  const linked = sessions.filter(
    (s) => s.linkedProjectId === projectId || s.appliedProjectId === projectId
  );
  if (!linked.length) return undefined;
  const rank = (s: ScriptWriterSession) => {
    if (s.status === "applied") return 0;
    if (s.status === "script_ready") return 1;
    if (s.status === "analysis_ready") return 2;
    return 3;
  };
  return [...linked].sort((a, b) => rank(a) - rank(b))[0];
}

export default function ProjectDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const { user, appUser } = useAuth();
  const { data: project, loading } = useDocument<Project>("projects", id);
  const { data: agreements } = useAgreements();
  const [board, setBoard] = useState<ProductionBoard | null>(null);
  const [scriptSessions, setScriptSessions] = useState<ScriptWriterSession[]>([]);
  const [spineLoading, setSpineLoading] = useState(false);

  const projectAgreements = useMemo(
    () =>
      agreements
        .filter((a) => a.projectId === id)
        .sort((a, b) => (b.updatedAt?.toMillis?.() ?? 0) - (a.updatedAt?.toMillis?.() ?? 0)),
    [agreements, id]
  );
  const projectAccess = useProjectAccess(id, project?.ownerUserId);
  const showScripts = canUseProductionTools(appUser) || projectAccess.canAccessScripts;
  const showPrepBoard =
    canManageProjects(appUser) ||
    canUseProductionTools(appUser) ||
    projectAccess.canAccessProduction;
  const showShots =
    canManageProjects(appUser) ||
    canUseProductionTools(appUser) ||
    projectAccess.canAccessShots ||
    projectAccess.canAccessProduction;
  const showProduction = showPrepBoard || showShots;
  const shotsOnly = showShots && !showPrepBoard && !showScripts;
  const canCreateDeal = canCreateQuotes(appUser);
  const canOpenTeamAccess = canManageProjects(appUser) || canManageUsers(appUser);
  const firstDayId = board?.productionDays?.length
    ? [...board.productionDays].sort((a, b) => a.dayNumber - b.dayNumber)[0]?.id
    : undefined;

  const primaryScript = useMemo(
    () => pickProjectScriptSession(scriptSessions, id, board),
    [scriptSessions, id, board]
  );
  const linkedScripts = useMemo(
    () =>
      scriptSessions.filter(
        (s) => s.linkedProjectId === id || s.appliedProjectId === id
      ),
    [scriptSessions, id]
  );

  useEffect(() => {
    if (!id || !showProduction) return;
    getProductionBoardByProject(id).then(setBoard).catch(() => setBoard(null));
  }, [id, showProduction]);

  useEffect(() => {
    if (!user || (!showProduction && !showScripts)) return;
    setSpineLoading(true);
    scriptWriterListSessions(() => user.getIdToken())
      .then((res) => setScriptSessions(res.sessions as ScriptWriterSession[]))
      .catch(() => setScriptSessions([]))
      .finally(() => setSpineLoading(false));
  }, [user, showProduction, showScripts]);

  if (loading) return <LoadingSpinner className="py-20" />;
  if (!project) {
    return (
      <div className="text-center py-20">
        <p className="text-slate-500">Project not found.</p>
        <Link href="/projects"><Button className="mt-4" variant="outline">Back</Button></Link>
      </div>
    );
  }

  return (
    <div className="pb-24">
      <PageHeader
        title={project.projectName}
        subtitle={`${project.clientName || "No client"} · $${project.totalProjectFee.toLocaleString()}`}
        action={
          <div className="flex flex-wrap gap-2">
            {showShots && (
              <Link href={`/projects/${project.id}/coverage`}>
                <Button size="touch" variant={shotsOnly ? "primary" : "outline"}>
                  Coverage
                </Button>
              </Link>
            )}
            {showShots && firstDayId && (
              <Link href={`/projects/${project.id}/production/days/${firstDayId}`}>
                <Button size="touch" variant="outline">
                  Call sheet
                </Button>
              </Link>
            )}
            {showPrepBoard && (
              <Link href={`/projects/${project.id}/stage`}>
                <Button size="touch" variant="outline">
                  <LayoutGrid className="mr-2 h-5 w-5" />
                  Stage planner
                </Button>
              </Link>
            )}
            {showPrepBoard && (
              <Link href={`/projects/${project.id}/production`}>
                <Button size="touch" variant="outline">
                  <LayoutGrid className="mr-2 h-5 w-5" />
                  Pre-production
                </Button>
              </Link>
            )}
            {showScripts && (
              <Link
                href={
                  primaryScript
                    ? `/script-writer/${primaryScript.id}`
                    : `/script-writer?${new URLSearchParams({
                        idea: `A ${project.projectType} project for ${project.clientName || "client"}: ${project.projectName}`,
                        title: project.projectName,
                        projectId: project.id,
                      }).toString()}`
                }
              >
                <Button size="touch" variant="outline">
                  <ScrollText className="mr-2 h-5 w-5" />
                  {primaryScript ? "Open script" : "Script writer"}
                </Button>
              </Link>
            )}
            {canCreateDeal ? (
              <Link href={`/agreements/new?projectId=${project.id}`}>
                <Button size="touch">
                  <Plus className="mr-2 h-5 w-5" />
                  New agreement
                </Button>
              </Link>
            ) : null}
          </div>
        }
      />

      {project.sourceRevenueOpportunityId && (
        <p className="mb-4 text-sm text-slate-600">
          From revenue opportunity:{" "}
          <Link
            href={`/revenue/opportunities/${project.sourceRevenueOpportunityId}`}
            className="font-medium text-sky-700 hover:underline"
          >
            View opportunity
          </Link>
        </p>
      )}

      {canOpenTeamAccess && (
        <p className="mb-6 text-sm text-slate-500">
          Team and permissions for this project are managed in{" "}
          <Link
            href={`/admin?project=${project.id}`}
            className="font-medium text-sky-700 hover:underline"
          >
            Admin → Team &amp; access
          </Link>
          .
        </p>
      )}

      {shotsOnly ? (
        <div className="mb-6 rounded-2xl border border-sky-200 bg-sky-50 px-4 py-4 text-sm text-sky-950">
          <p className="font-semibold">On-set access</p>
          <p className="mt-1 text-sky-900/90">
            You have Coverage and call sheet for this job. Open Coverage for the shot bible, or the
            call sheet for logistics and print.
          </p>
          <div className="mt-3 flex flex-wrap gap-3">
            <Link
              href={`/projects/${project.id}/coverage`}
              className="font-medium text-sky-800 underline"
            >
              Open Coverage
            </Link>
            {firstDayId ? (
              <Link
                href={`/projects/${project.id}/production/days/${firstDayId}`}
                className="font-medium text-sky-800 underline"
              >
                Open call sheet
              </Link>
            ) : null}
          </div>
        </div>
      ) : null}

      {spineLoading && (showProduction || showScripts) ? (
        <LoadingSpinner className="py-8 mb-8" />
      ) : (
        <ProjectSpine
          projectId={project.id}
          projectName={project.projectName}
          clientName={project.clientName}
          scriptSession={primaryScript}
          board={board}
          agreements={projectAgreements}
          showPrepBoard={showPrepBoard}
          showShots={showShots}
          showScripts={showScripts}
          canCreateDeal={canCreateDeal}
        />
      )}

      {showShots && board && (
        <div className="mb-8">
          <ProjectShotProgressCard projectId={project.id} board={board} />
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardBody className="space-y-4">
            <div className="flex justify-between">
              <h2 className="text-lg font-semibold">Details</h2>
              <Badge>{project.status.replace(/_/g, " ")}</Badge>
            </div>
            <dl className="grid gap-3 text-sm">
              <div>
                <dt className="text-slate-500">Type</dt>
                <dd className="font-medium">
                  {project.projectType} · {project.shootType}
                </dd>
              </div>
              <div>
                <dt className="text-slate-500">Shoot Date</dt>
                <dd className="font-medium">{formatDate(project.shootDate)}</dd>
              </div>
              <div>
                <dt className="text-slate-500">Location</dt>
                <dd className="font-medium">{project.location || "—"}</dd>
              </div>
              <div>
                <dt className="text-slate-500">Agreement Type</dt>
                <dd className="font-medium capitalize">{project.agreementType.replace(/_/g, " ")}</dd>
              </div>
            </dl>
          </CardBody>
        </Card>

        <Card>
          <CardBody>
            <h2 className="text-lg font-semibold mb-4">Agreements</h2>
            {projectAgreements.length === 0 ? (
              <p className="text-sm text-slate-500">No agreements yet.</p>
            ) : (
              <ul className="divide-y divide-slate-100">
                {projectAgreements.map((a) => (
                  <li key={a.id}>
                    <Link
                      href={`/agreements/${a.id}`}
                      className="flex items-center justify-between py-3 hover:bg-slate-50 -mx-2 px-2 rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        <FileText className="h-5 w-5 text-slate-400" />
                        <div>
                          <p className="font-medium">{a.title}</p>
                          <p className="text-sm text-slate-500 capitalize">
                            {a.agreementType.replace(/_/g, " ")}
                          </p>
                        </div>
                      </div>
                      <Badge>{a.status.replace(/_/g, " ")}</Badge>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </CardBody>
        </Card>

        {showScripts && (
          <Card>
            <CardBody>
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-lg font-semibold flex items-center gap-2">
                  <ScrollText className="h-5 w-5 text-violet-600" />
                  Script sessions
                </h2>
                <Link
                  href={`/script-writer?${new URLSearchParams({
                    idea: `A ${project.projectType} project for ${project.clientName || "client"}: ${project.projectName}`,
                    title: project.projectName,
                    projectId: project.id,
                  }).toString()}`}
                >
                  <Button size="sm" variant="outline">New script</Button>
                </Link>
              </div>
              {linkedScripts.length === 0 ? (
                <p className="text-sm text-slate-500">No scripts linked to this project yet.</p>
              ) : (
                <ul className="divide-y divide-slate-100">
                  {linkedScripts.map((s) => (
                    <li key={s.id}>
                      <div className="flex items-center justify-between py-3 hover:bg-slate-50 -mx-2 px-2 rounded-lg">
                        <Link href={`/script-writer/${s.id}`} className="min-w-0 flex-1">
                          <p className="font-medium">{s.title}</p>
                          <p className="text-xs text-slate-500 capitalize">{s.status.replace(/_/g, " ")}</p>
                        </Link>
                        {s.status === "applied" ? (
                          <Link
                            href={`/projects/${project.id}/production`}
                            className="ml-3 shrink-0 text-xs font-medium text-sky-700 hover:underline"
                          >
                            View board
                          </Link>
                        ) : (
                          <ArrowRight className="ml-3 h-4 w-4 shrink-0 text-slate-300" />
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </CardBody>
          </Card>
        )}

        {showPrepBoard && board && (
          <Card className="lg:col-span-2">
            <CardBody>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="text-lg font-semibold flex items-center gap-2">
                    <LayoutGrid className="h-5 w-5 text-indigo-600" />
                    Pre-production board
                  </h2>
                  <p className="mt-1 text-sm text-slate-500">
                    {board.people.length} people · {board.productionDays.length} shoot days ·{" "}
                    {board.locations.filter((l) => l.status === "booked").length} locations booked
                    {board.scriptSessionId ? " · Script applied" : ""}
                  </p>
                </div>
                <Link href={`/projects/${project.id}/production`}>
                  <Button size="sm" variant="outline">Open board</Button>
                </Link>
              </div>
            </CardBody>
          </Card>
        )}
      </div>
    </div>
  );
}
