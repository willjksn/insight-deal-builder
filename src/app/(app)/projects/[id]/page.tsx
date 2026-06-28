"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { FileText, Plus, Clapperboard, LayoutGrid } from "lucide-react";
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
import { ScoutProject } from "@/lib/scout/types";
import { getScoutProjectsForLinkedProject } from "@/lib/firebase/scoutFirestore";
import { canUseShotScout, canManageProjects } from "@/lib/utils/permissions";

export default function ProjectDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const { appUser } = useAuth();
  const { data: project, loading } = useDocument<Project>("projects", id);
  const { data: agreements } = useAgreements();
  const [scoutSessions, setScoutSessions] = useState<ScoutProject[]>([]);
  const projectAgreements = agreements.filter((a) => a.projectId === id);
  const showScout = canUseShotScout(appUser);
  const showProduction = showScout || canManageProjects(appUser);

  useEffect(() => {
    if (!showScout || !id) return;
    getScoutProjectsForLinkedProject(id).then(setScoutSessions).catch(() => setScoutSessions([]));
  }, [id, showScout]);

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
            {showProduction && (
              <Link href={`/projects/${project.id}/production`}>
                <Button size="touch" variant="outline">
                  <LayoutGrid className="mr-2 h-5 w-5" />
                  Pre-production
                </Button>
              </Link>
            )}
            {showScout && (
              <Link href={`/scout/new?projectId=${project.id}`}>
                <Button size="touch" variant="outline">
                  <Clapperboard className="mr-2 h-5 w-5" />
                  Scout scene
                </Button>
              </Link>
            )}
            <Link href={`/agreements/new?projectId=${project.id}`}>
              <Button size="touch">
                <Plus className="mr-2 h-5 w-5" />
                New Agreement
              </Button>
            </Link>
          </div>
        }
      />

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

        {showScout && (
          <Card className="lg:col-span-2">
            <CardBody>
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-lg font-semibold flex items-center gap-2">
                  <Clapperboard className="h-5 w-5 text-sky-600" />
                  Shot Scout sessions
                </h2>
                <Link href={`/scout/new?projectId=${project.id}`}>
                  <Button size="sm" variant="outline">
                    Add scout session
                  </Button>
                </Link>
              </div>
              {scoutSessions.length === 0 ? (
                <p className="text-sm text-slate-500">No location scouts linked to this project yet.</p>
              ) : (
                <ul className="divide-y divide-slate-100">
                  {scoutSessions.map((s) => (
                    <li key={s.id}>
                      <Link
                        href={`/scout/${s.id}`}
                        className="flex items-center justify-between py-3 hover:bg-slate-50 -mx-2 px-2 rounded-lg"
                      >
                        <span className="font-medium">{s.projectName}</span>
                        <Badge>{s.status.replace(/_/g, " ")}</Badge>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </CardBody>
          </Card>
        )}
      </div>
    </div>
  );
}

