"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardBody } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { useDocument } from "@/hooks/useDocument";
import { useAgreements } from "@/hooks/useAgreements";
import { formatDate } from "@/lib/utils/format";
import { Project } from "@/lib/types";
import { FileText, Plus } from "lucide-react";

export default function ProjectDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const { data: project, loading } = useDocument<Project>("projects", id);
  const { data: agreements } = useAgreements();
  const projectAgreements = agreements.filter((a) => a.projectId === id);

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
      <PageHeader title={project.projectName} subtitle={`${project.clientName || "No client"} · $${project.totalProjectFee.toLocaleString()}`}
        action={<Link href={`/agreements/new?projectId=${project.id}`}><Button size="touch"><Plus className="mr-2 h-5 w-5" />New Agreement</Button></Link>} />

      <div className="grid gap-6 lg:grid-cols-2">
        <Card><CardBody className="space-y-4">
          <div className="flex justify-between"><h2 className="text-lg font-semibold">Details</h2><Badge>{project.status.replace(/_/g, " ")}</Badge></div>
          <dl className="grid gap-3 text-sm">
            <div><dt className="text-slate-500">Type</dt><dd className="font-medium">{project.projectType} · {project.shootType}</dd></div>
            <div><dt className="text-slate-500">Shoot Date</dt><dd className="font-medium">{formatDate(project.shootDate)}</dd></div>
            <div><dt className="text-slate-500">Location</dt><dd className="font-medium">{project.location || "—"}</dd></div>
            <div><dt className="text-slate-500">Agreement Type</dt><dd className="font-medium capitalize">{project.agreementType.replace(/_/g, " ")}</dd></div>
          </dl>
        </CardBody></Card>

        <Card><CardBody>
          <h2 className="text-lg font-semibold mb-4">Agreements</h2>
          {projectAgreements.length === 0 ? <p className="text-sm text-slate-500">No agreements yet.</p> : (
            <ul className="divide-y divide-slate-100 dark:divide-slate-800">
              {projectAgreements.map((a) => (
                <li key={a.id}><Link href={`/agreements/${a.id}`} className="flex items-center justify-between py-3 hover:bg-slate-50 dark:hover:bg-slate-800/50 -mx-2 px-2 rounded-lg">
                  <div className="flex items-center gap-3"><FileText className="h-5 w-5 text-slate-400" /><div><p className="font-medium">{a.title}</p><p className="text-sm text-slate-500 capitalize">{a.agreementType.replace(/_/g, " ")}</p></div></div>
                  <Badge>{a.status.replace(/_/g, " ")}</Badge>
                </Link></li>
              ))}
            </ul>
          )}
        </CardBody></Card>
      </div>
    </div>
  );
}
