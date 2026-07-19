"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  Plus,
  FileText,
  FolderKanban,
  ArrowRight,
  Clapperboard,
  ScrollText,
  LayoutGrid,
  PenLine,
  BookOpen,
} from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardBody } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { Button } from "@/components/ui/Button";
import { useCollection } from "@/hooks/useCollection";
import { useAgreements } from "@/hooks/useAgreements";
import { useAuth } from "@/contexts/AuthContext";
import { APP_TAGLINE } from "@/lib/brand";
import { scriptWriterListSessions } from "@/lib/scriptWriter/apiClient";
import { ScriptWriterSession } from "@/lib/scriptWriter/types";
import {
  canCreateQuotes,
  canManageProjects,
  canUseProductionTools,
} from "@/lib/utils/permissions";
import { Project } from "@/lib/types";

export default function DashboardPage() {
  const { user, appUser } = useAuth();
  const { data: agreements, loading: aLoading } = useAgreements();
  const { data: projects, loading: pLoading } = useCollection<Project>("projects");
  const showProduction = canUseProductionTools(appUser);
  const [scriptSessions, setScriptSessions] = useState<ScriptWriterSession[]>([]);
  const [scriptsLoading, setScriptsLoading] = useState(false);

  const loading = aLoading || pLoading || (showProduction && scriptsLoading);

  useEffect(() => {
    if (!user || !showProduction) return;
    setScriptsLoading(true);
    scriptWriterListSessions(() => user.getIdToken())
      .then((res) => setScriptSessions((res.sessions as ScriptWriterSession[]).slice(0, 5)))
      .catch(() => setScriptSessions([]))
      .finally(() => setScriptsLoading(false));
  }, [user, showProduction]);

  const drafts = agreements.filter((a) => a.status === "draft").length;
  const ready = agreements.filter((a) => a.status === "ready_for_signature").length;
  const signed = agreements.filter((a) => a.status === "signed" || a.status === "completed").length;
  const activeProjects = projects.filter((p) => p.status !== "completed" && p.status !== "archived").length;

  return (
    <div className="pb-24 lg:pb-0">
      <PageHeader
        title="Command center"
        subtitle={APP_TAGLINE}
        action={
          canManageProjects(appUser) ? (
            <Link href="/projects">
              <Button size="touch" variant="outline">
                <FolderKanban className="mr-2 h-5 w-5" />
                All projects
              </Button>
            </Link>
          ) : canCreateQuotes(appUser) ? (
            <Link href="/agreements/new">
              <Button size="touch">
                <Plus className="mr-2 h-5 w-5" />
                New agreement
              </Button>
            </Link>
          ) : undefined
        }
      />

      {loading ? (
        <LoadingSpinner className="py-20" />
      ) : (
        <>
          <div className="mb-8 grid grid-cols-2 gap-3 lg:grid-cols-4">
            <StatCard label="Active projects" value={activeProjects} href="/projects" accent="violet" />
            <StatCard label="Draft deals" value={drafts} href="/agreements?status=draft" accent="slate" />
            <StatCard label="Ready to sign" value={ready} href="/agreements?status=ready_for_signature" accent="sky" />
            <StatCard label="Signed" value={signed} href="/agreements?status=signed" accent="emerald" />
          </div>

          {showProduction ? (
            <section className="mb-8">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Production</h2>
              </div>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <QuickAction
                  href="/script-writer"
                  icon={ScrollText}
                  label="Script writer"
                  description="Idea → full script"
                  accent="violet"
                />
                <QuickAction
                  href="/projects"
                  icon={LayoutGrid}
                  label="Pre-production"
                  description="Open a project board"
                  accent="indigo"
                />
                <QuickAction
                  href="/reference"
                  icon={BookOpen}
                  label="Reference guide"
                  description="FX6 & lens lookup"
                  accent="sky"
                />
                <QuickAction
                  href="/stage"
                  icon={LayoutGrid}
                  label="Stage planner"
                  description="Lighting diagram"
                  accent="indigo"
                />
              </div>
            </section>
          ) : null}

          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardBody>
                <SectionHeader
                  title="Recent projects"
                  icon={FolderKanban}
                  href="/projects"
                  actionLabel="All projects"
                />
                {projects.length === 0 ? (
                  <EmptyPanel
                    text="Start from Projects — script, Prep, Coverage, call sheets, and deals live there."
                    action={
                      canManageProjects(appUser) ? (
                        <Link href="/projects">
                          <Button size="sm" variant="outline">
                            <FolderKanban className="mr-1.5 h-4 w-4" />
                            Create a project
                          </Button>
                        </Link>
                      ) : undefined
                    }
                  />
                ) : (
                  <ul className="divide-y divide-slate-100">
                    {projects.slice(0, 6).map((p) => (
                      <li key={p.id}>
                        <Link
                          href={`/projects/${p.id}`}
                          className="flex items-center justify-between py-3 hover:bg-slate-50 -mx-2 px-2 rounded-xl transition-colors"
                        >
                          <div className="min-w-0">
                            <p className="truncate font-medium text-slate-900">{p.projectName}</p>
                            <p className="truncate text-sm text-slate-500">
                              {p.clientName || "No client"} · ${p.totalProjectFee.toLocaleString()}
                            </p>
                          </div>
                          <Badge>{p.status.replace(/_/g, " ")}</Badge>
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </CardBody>
            </Card>

            <Card>
              <CardBody>
                <SectionHeader
                  title="Recent agreements"
                  icon={FileText}
                  href="/agreements"
                  actionLabel="All deals"
                />
                {agreements.length === 0 ? (
                  <EmptyPanel
                    text="No agreements yet."
                    action={
                      canCreateQuotes(appUser) ? (
                        <Link href="/agreements/new">
                          <Button size="sm" variant="outline">
                            <Plus className="mr-1.5 h-4 w-4" />
                            New agreement
                          </Button>
                        </Link>
                      ) : undefined
                    }
                  />
                ) : (
                  <ul className="divide-y divide-slate-100">
                    {agreements.slice(0, 6).map((a) => (
                      <li key={a.id}>
                        <Link
                          href={`/agreements/${a.id}`}
                          className="flex items-center justify-between gap-2 py-3 hover:bg-slate-50 -mx-2 px-2 rounded-xl transition-colors"
                        >
                          <div className="min-w-0">
                            <p className="truncate font-medium text-slate-900">{a.title}</p>
                            <p className="truncate text-sm text-slate-500">
                              {a.projectDetails?.projectName || "No project"}
                            </p>
                          </div>
                          <Badge>{a.status.replace(/_/g, " ")}</Badge>
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
                {canCreateQuotes(appUser) ? (
                  <Link href="/agreements/new" className="mt-4 inline-block">
                    <Button size="sm" variant="outline">
                      <Plus className="mr-1.5 h-4 w-4" />
                      New agreement
                    </Button>
                  </Link>
                ) : null}
              </CardBody>
            </Card>

            {showProduction ? (
              <>
                <Card>
                  <CardBody>
                    <SectionHeader title="Recent scripts" icon={PenLine} href="/script-writer" actionLabel="Script writer" />
                    {scriptsLoading ? (
                      <LoadingSpinner className="py-6" />
                    ) : scriptSessions.length === 0 ? (
                      <EmptyPanel
                        text="No scripts yet — start with an idea or reference clip."
                        action={
                          <Link href="/script-writer">
                            <Button size="sm" variant="outline">
                              <PenLine className="mr-1.5 h-4 w-4" />
                              New script
                            </Button>
                          </Link>
                        }
                      />
                    ) : (
                      <ul className="divide-y divide-slate-100">
                        {scriptSessions.map((s) => (
                          <li key={s.id}>
                            <Link
                              href={`/script-writer/${s.id}`}
                              className="block py-3 hover:bg-slate-50 -mx-2 px-2 rounded-xl transition-colors"
                            >
                              <p className="truncate font-medium text-slate-900">{s.title}</p>
                              <p className="text-xs text-slate-500">
                                {s.status === "applied"
                                  ? "Applied"
                                  : s.status === "script_ready"
                                    ? "Script ready"
                                    : s.status === "analysis_ready"
                                      ? "Review analysis"
                                      : "In progress"}
                              </p>
                            </Link>
                          </li>
                        ))}
                      </ul>
                    )}
                  </CardBody>
                </Card>
              </>
            ) : null}
          </div>
        </>
      )}
    </div>
  );
}

function SectionHeader({
  title,
  icon: Icon,
  href,
  actionLabel,
}: {
  title: string;
  icon: typeof FolderKanban;
  href: string;
  actionLabel: string;
}) {
  return (
    <div className="mb-4 flex items-center justify-between gap-2">
      <h2 className="flex items-center gap-2 text-lg font-semibold text-slate-900">
        <Icon className="h-5 w-5 text-slate-500" />
        {title}
      </h2>
      <Link href={href} className="shrink-0 text-sm font-medium text-sky-700 hover:text-sky-800 flex items-center gap-1">
        {actionLabel} <ArrowRight className="h-4 w-4" />
      </Link>
    </div>
  );
}

function EmptyPanel({ text, action }: { text: string; action?: React.ReactNode }) {
  return (
    <div className="py-4">
      <p className="text-sm text-slate-500">{text}</p>
      {action ? <div className="mt-3">{action}</div> : null}
    </div>
  );
}

function StatCard({
  label,
  value,
  href,
  accent,
}: {
  label: string;
  value: number;
  href: string;
  accent: "violet" | "slate" | "sky" | "emerald";
}) {
  const styles = {
    violet: "from-violet-400 to-violet-600 shadow-violet-500/20",
    slate: "from-slate-600 to-slate-800 shadow-slate-500/20",
    sky: "from-sky-400 to-blue-500 shadow-sky-500/25",
    emerald: "from-emerald-400 to-emerald-600 shadow-emerald-500/25",
  };
  return (
    <Link href={href}>
      <Card className="h-full transition-all hover:-translate-y-0.5 hover:shadow-md">
        <CardBody className="flex items-center gap-3 py-4">
          <div className={`flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br text-white text-lg font-bold shadow-md ${styles[accent]}`}>
            {value}
          </div>
          <p className="text-sm font-medium text-slate-700">{label}</p>
        </CardBody>
      </Card>
    </Link>
  );
}

function QuickAction({
  href,
  icon: Icon,
  label,
  description,
  accent,
}: {
  href: string;
  icon: typeof ScrollText;
  label: string;
  description: string;
  accent: "violet" | "sky" | "indigo";
}) {
  const iconGradients = {
    violet: "from-violet-500 to-indigo-600",
    sky: "from-sky-400 to-blue-500",
    indigo: "from-indigo-500 to-violet-600",
  };
  const ringStyles = {
    violet: "ring-violet-100 hover:ring-violet-200",
    sky: "ring-sky-100 hover:ring-sky-200",
    indigo: "ring-indigo-100 hover:ring-indigo-200",
  };
  return (
    <Link href={href}>
      <Card className={`h-full ring-1 transition-all hover:-translate-y-0.5 hover:shadow-md ${ringStyles[accent]}`}>
        <CardBody className="flex items-start gap-3">
          <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br text-white shadow-md ${iconGradients[accent]}`}>
            <Icon className="h-5 w-5" />
          </div>
          <div>
            <p className="font-semibold text-slate-900">{label}</p>
            <p className="text-xs text-slate-500">{description}</p>
          </div>
        </CardBody>
      </Card>
    </Link>
  );
}
